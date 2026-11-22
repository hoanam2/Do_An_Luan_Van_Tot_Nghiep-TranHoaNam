/**
 * Script xuất toàn bộ cấu trúc CSDL (schema.sql), dữ liệu mẫu thực tế (seed_data.sql)
 * và trích xuất toàn bộ bảng dữ liệu PostgreSQL (hotel_booking_db) ra JSON & CSV.
 *
 * Cách chạy:
 *   npm --prefix backend run db:export
 *   hoặc: node backend/src/scripts/export_database.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const DB_DIR = path.join(ROOT_DIR, 'database');
const JSON_DIR = path.join(DB_DIR, 'exports', 'json');
const CSV_DIR = path.join(DB_DIR, 'exports', 'csv');

const ensureDirs = () => {
  fs.mkdirSync(DB_DIR, { recursive: true });
  fs.mkdirSync(JSON_DIR, { recursive: true });
  fs.mkdirSync(CSV_DIR, { recursive: true });
};

/**
 * Sắp xếp Topo các bảng theo quan hệ khóa ngoại (bảng cha đứng trước bảng con).
 */
const topoSortTables = (tableNames, fkEdges) => {
  const inDegree = new Map();
  const adj = new Map();
  for (const t of tableNames) {
    inDegree.set(t, 0);
    adj.set(t, new Set());
  }

  for (const { child, parent } of fkEdges) {
    if (child === parent) continue;
    if (!adj.has(parent) || !inDegree.has(child)) continue;
    if (!adj.get(parent).has(child)) {
      adj.get(parent).add(child);
      inDegree.set(child, inDegree.get(child) + 1);
    }
  }

  const queue = [...tableNames].filter((t) => inDegree.get(t) === 0).sort();
  const ordered = [];

  while (queue.length > 0) {
    const curr = queue.shift();
    ordered.push(curr);
    for (const next of adj.get(curr)) {
      const deg = inDegree.get(next) - 1;
      inDegree.set(next, deg);
      if (deg === 0) {
        queue.push(next);
        queue.sort();
      }
    }
  }

  // Nếu có chu trình FK (nếu có), thêm các bảng còn lại vào cuối
  for (const t of tableNames) {
    if (!ordered.includes(t)) ordered.push(t);
  }
  return ordered;
};

/**
 * Chuyển giá trị JS sang chuỗi SQL hợp lệ cho PostgreSQL.
 */
const toSqlLiteral = (val, colMeta) => {
  if (val === null || val === undefined) return 'NULL';

  const type = String(colMeta.formatted_type || '').toLowerCase();

  if (typeof val === 'boolean' || type === 'boolean') {
    return val ? 'TRUE' : 'FALSE';
  }

  if (Array.isArray(val)) {
    if (val.length === 0) {
      return `'{}'::${colMeta.formatted_type}`;
    }
    const items = val.map((item) => {
      if (item === null || item === undefined) return 'NULL';
      if (typeof item === 'number') return Number.isFinite(item) ? String(item) : 'NULL';
      return `'${String(item).replace(/'/g, "''")}'`;
    });
    return `ARRAY[${items.join(', ')}]::${colMeta.formatted_type}`;
  }

  if (val instanceof Date) {
    if (type === 'date') {
      const yyyy = val.getFullYear();
      const mm = String(val.getMonth() + 1).padStart(2, '0');
      const dd = String(val.getDate()).padStart(2, '0');
      return `'${yyyy}-${mm}-${dd}'`;
    }
    return `'${val.toISOString()}'`;
  }

  if (type === 'json' || type === 'jsonb' || typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::${type === 'json' ? 'json' : 'jsonb'}`;
  }

  if (
    typeof val === 'number' ||
    (/^(smallint|integer|bigint|numeric|decimal|real|double precision)/.test(type) &&
      val !== '' &&
      !Number.isNaN(Number(val)))
  ) {
    return String(val);
  }

  const str = String(val);
  if (str.includes('\n') || str.includes('\r')) {
    const escaped = str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
    return `E'${escaped}'`;
  }
  return `'${str.replace(/'/g, "''")}'`;
};

/**
 * Chuyển giá trị sang ô CSV chuẩn (RFC 4180).
 */
const toCsvCell = (val, colMeta) => {
  if (val === null || val === undefined) return '';
  let str;
  if (val instanceof Date) {
    const type = String(colMeta.formatted_type || '').toLowerCase();
    if (type === 'date') {
      const yyyy = val.getFullYear();
      const mm = String(val.getMonth() + 1).padStart(2, '0');
      const dd = String(val.getDate()).padStart(2, '0');
      str = `${yyyy}-${mm}-${dd}`;
    } else {
      str = val.toISOString();
    }
  } else if (typeof val === 'object') {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const run = async () => {
  ensureDirs();
  const exportedAt = new Date().toISOString();
  const dbName = process.env.DB_NAME || 'hotel_booking_db';

  console.log(`=== Bắt đầu trích xuất CSDL PostgreSQL: ${dbName} ===`);

  // 1. Lấy danh sách toàn bộ bảng trong schema public
  const tablesRes = await db.query(`
    SELECT c.oid, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname ASC
  `);
  const rawTables = tablesRes.rows;
  const tableOidMap = new Map(rawTables.map((t) => [t.table_name, t.oid]));
  const allTableNames = rawTables.map((t) => t.table_name);

  // 2. Lấy toàn bộ ràng buộc (PK, UNIQUE, CHECK, FK)
  const constraintsRes = await db.query(`
    SELECT
      cls.relname AS table_name,
      c.conname AS constraint_name,
      c.contype AS constraint_type,
      ref_cls.relname AS ref_table_name,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class cls ON cls.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cls.relnamespace
    LEFT JOIN pg_class ref_cls ON ref_cls.oid = c.confrelid
    WHERE n.nspname = 'public'
      AND cls.relkind = 'r'
      AND c.contype IN ('p', 'u', 'c', 'f')
    ORDER BY cls.relname, c.contype, c.conname
  `);

  const fkEdges = constraintsRes.rows
    .filter((c) => c.constraint_type === 'f' && c.ref_table_name)
    .map((c) => ({ child: c.table_name, parent: c.ref_table_name }));

  const orderedTables = topoSortTables(allTableNames, fkEdges);

  // 3. Lấy metadata cột cho từng bảng bằng pg_attribute + format_type (chính xác 100% cho cả REAL[])
  const columnsByTable = new Map();
  const pkColsByTable = new Map();
  const serialCols = [];

  for (const tableName of orderedTables) {
    const oid = tableOidMap.get(tableName);
    const colsRes = await db.query(
      `SELECT
         a.attnum,
         a.attname AS column_name,
         format_type(a.atttypid, a.atttypmod) AS formatted_type,
         a.attnotnull AS not_null,
         a.attidentity AS identity_kind,
         pg_get_expr(ad.adbin, ad.adrelid) AS column_default
       FROM pg_attribute a
       LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
       WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped
       ORDER BY a.attnum ASC`,
      [oid]
    );
    columnsByTable.set(tableName, colsRes.rows);

    const pkRes = await db.query(
      `SELECT a.attname AS column_name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = $1 AND i.indisprimary
       ORDER BY array_position(i.indkey, a.attnum)`,
      [oid]
    );
    pkColsByTable.set(
      tableName,
      pkRes.rows.map((r) => r.column_name)
    );

    for (const col of colsRes.rows) {
      if (col.column_default && /^nextval\(/i.test(col.column_default)) {
        serialCols.push({ table: tableName, column: col.column_name });
      }
    }
  }

  // 4. Lấy danh sách index (loại trừ index tự sinh từ constraint PK/UNIQUE)
  const indexesRes = await db.query(`
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      pg_get_indexdef(idx.indexrelid) AS index_def
    FROM pg_index idx
    JOIN pg_class i ON i.oid = idx.indexrelid
    JOIN pg_class t ON t.oid = idx.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    LEFT JOIN pg_constraint con ON con.conindid = idx.indexrelid
    WHERE n.nspname = 'public'
      AND t.relkind = 'r'
      AND con.oid IS NULL
    ORDER BY t.relname, i.relname
  `);

  // 5. Lấy các hàm PL/pgSQL / SQL tự định nghĩa trong schema public (như cosine_similarity)
  const funcsRes = await db.query(`
    SELECT
      p.proname AS func_name,
      pg_get_functiondef(p.oid) AS func_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
    ORDER BY p.proname ASC
  `);

  // =========================================================================
  // TẠO FILE database/schema.sql
  // =========================================================================
  const schemaLines = [
    '-- ============================================================================',
    `-- STAYWITHUS - SCHEMA CƠ SỞ DỮ LIỆU POSTGRESQL (${dbName})`,
    `-- Xuất tự động từ CSDL thực tế lúc: ${exportedAt}`,
    `-- Tổng số bảng: ${orderedTables.length} | Hàm tùy chỉnh: ${funcsRes.rows.length}`,
    '-- ============================================================================',
    '',
    'SET client_encoding = \'UTF8\';',
    'SET standard_conforming_strings = on;',
    '',
  ];

  for (const tableName of orderedTables) {
    const cols = columnsByTable.get(tableName);
    const tableConstraints = constraintsRes.rows.filter((c) => c.table_name === tableName);
    const nonFkConstraints = tableConstraints.filter((c) => c.constraint_type !== 'f');

    schemaLines.push(`-- Bảng: ${tableName}`);
    schemaLines.push(`CREATE TABLE IF NOT EXISTS public.${tableName} (`);

    const bodyLines = [];
    for (const col of cols) {
      let colDef = `  ${col.column_name} `;
      const isSerial = col.column_default && /^nextval\(/i.test(col.column_default);

      if (isSerial && col.formatted_type === 'bigint') {
        colDef += 'BIGSERIAL';
      } else if (isSerial && col.formatted_type === 'integer') {
        colDef += 'SERIAL';
      } else if (isSerial && col.formatted_type === 'smallint') {
        colDef += 'SMALLSERIAL';
      } else {
        colDef += col.formatted_type;
        if (col.identity_kind === 'a') {
          colDef += ' GENERATED ALWAYS AS IDENTITY';
        } else if (col.identity_kind === 'd') {
          colDef += ' GENERATED BY DEFAULT AS IDENTITY';
        } else if (col.column_default !== null) {
          colDef += ` DEFAULT ${col.column_default}`;
        }
      }

      if (col.not_null && !isSerial) {
        colDef += ' NOT NULL';
      }
      bodyLines.push(colDef);
    }

    for (const con of nonFkConstraints) {
      bodyLines.push(`  CONSTRAINT ${con.constraint_name} ${con.definition}`);
    }

    schemaLines.push(bodyLines.join(',\n'));
    schemaLines.push(');');
    schemaLines.push('');
  }

  // Khóa ngoại (ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY)
  const fkConstraints = constraintsRes.rows.filter((c) => c.constraint_type === 'f');
  if (fkConstraints.length > 0) {
    schemaLines.push('-- ============================================================================');
    schemaLines.push('-- RÀNG BUỘC KHÓA NGOẠI (FOREIGN KEYS)');
    schemaLines.push('-- ============================================================================');
    schemaLines.push('');
    for (const fk of fkConstraints) {
      schemaLines.push(`DO $$ BEGIN`);
      schemaLines.push(
        `  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${fk.constraint_name}') THEN`
      );
      schemaLines.push(
        `    ALTER TABLE public.${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} ${fk.definition};`
      );
      schemaLines.push(`  END IF;`);
      schemaLines.push(`END $$;`);
    }
    schemaLines.push('');
  }

  // Indexes
  if (indexesRes.rows.length > 0) {
    schemaLines.push('-- ============================================================================');
    schemaLines.push('-- CHỈ MỤC TỐI ƯU TRUY VẤN (INDEXES)');
    schemaLines.push('-- ============================================================================');
    schemaLines.push('');
    for (const idx of indexesRes.rows) {
      const safeDef = idx.index_def
        .replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
        .replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ');
      schemaLines.push(`${safeDef};`);
    }
    schemaLines.push('');
  }

  // Custom Functions (e.g. cosine_similarity)
  if (funcsRes.rows.length > 0) {
    schemaLines.push('-- ============================================================================');
    schemaLines.push('-- HÀM TÙY CHỈNH (STORED FUNCTIONS - AI EMBEDDING COSINE SIMILARITY)');
    schemaLines.push('-- ============================================================================');
    schemaLines.push('');
    for (const fn of funcsRes.rows) {
      schemaLines.push(`-- Function: ${fn.func_name}`);
      schemaLines.push(`${fn.func_def.trim()};`);
      schemaLines.push('');
    }
  }

  const schemaPath = path.join(DB_DIR, 'schema.sql');
  fs.writeFileSync(schemaPath, schemaLines.join('\n'), 'utf8');

  // =========================================================================
  // TẠO FILE database/seed_data.sql + JSON + CSV
  // =========================================================================
  const seedLines = [
    '-- ============================================================================',
    `-- STAYWITHUS - DỮ LIỆU THỰC TẾ TỪ POSTGRESQL (${dbName})`,
    `-- Xuất tự động lúc: ${exportedAt}`,
    '-- Ghi chú: Chạy database/schema.sql trước khi nạp file này.',
    '-- ============================================================================',
    '',
    'SET client_encoding = \'UTF8\';',
    'SET standard_conforming_strings = on;',
    '',
    'BEGIN;',
    '',
  ];

  const allJsonData = {};
  const tableCounts = {};
  let totalRows = 0;

  for (const tableName of orderedTables) {
    const cols = columnsByTable.get(tableName);
    const pkCols = pkColsByTable.get(tableName) || [];
    const orderClause =
      pkCols.length > 0 ? `ORDER BY ${pkCols.map((c) => `${c} ASC`).join(', ')}` : '';

    const dataRes = await db.query(`SELECT * FROM public.${tableName} ${orderClause}`);
    const rows = dataRes.rows;
    tableCounts[tableName] = rows.length;
    totalRows += rows.length;
    allJsonData[tableName] = rows;

    // 1) Xuất JSON từng bảng
    fs.writeFileSync(
      path.join(JSON_DIR, `${tableName}.json`),
      JSON.stringify(rows, null, 2),
      'utf8'
    );

    // 2) Xuất CSV từng bảng (có UTF-8 BOM để mở Excel tiếng Việt không lỗi font)
    const csvHeader = cols.map((c) => c.column_name).join(',');
    const csvRows = rows.map((row) =>
      cols.map((c) => toCsvCell(row[c.column_name], c)).join(',')
    );
    fs.writeFileSync(
      path.join(CSV_DIR, `${tableName}.csv`),
      '\uFEFF' + [csvHeader, ...csvRows].join('\r\n'),
      'utf8'
    );

    // 3) Ghi SQL INSERT vào seed_data.sql
    seedLines.push(`-- Dữ liệu bảng ${tableName} (${rows.length} dòng)`);
    if (rows.length > 0) {
      const colNames = cols.map((c) => c.column_name).join(', ');
      for (const row of rows) {
        const vals = cols.map((c) => toSqlLiteral(row[c.column_name], c)).join(', ');
        seedLines.push(
          `INSERT INTO public.${tableName} (${colNames}) VALUES (${vals}) ON CONFLICT DO NOTHING;`
        );
      }
    }
    seedLines.push('');
  }

  // Reset toàn bộ sequence sau khi insert dữ liệu có sẵn ID
  if (serialCols.length > 0) {
    seedLines.push('-- Đồng bộ lại bộ đếm SEQUENCE (tránh trùng khóa chính khi thêm dữ liệu mới)');
    for (const { table, column } of serialCols) {
      seedLines.push(
        `SELECT setval(pg_get_serial_sequence('public.${table}', '${column}'), COALESCE((SELECT MAX(${column}) FROM public.${table}), 1), (SELECT COUNT(*) > 0 FROM public.${table}));`
      );
    }
    seedLines.push('');
  }

  seedLines.push('COMMIT;');
  seedLines.push('');

  const seedPath = path.join(DB_DIR, 'seed_data.sql');
  fs.writeFileSync(seedPath, seedLines.join('\n'), 'utf8');

  // Xuất file tổng hợp JSON duy nhất
  const allDataBundle = {
    project: 'StayWithUs',
    database: dbName,
    exported_at: exportedAt,
    summary: {
      total_tables: orderedTables.length,
      total_rows: totalRows,
      tables: tableCounts,
    },
    data: allJsonData,
  };
  const allJsonPath = path.join(DB_DIR, 'exports', 'all_data.json');
  fs.writeFileSync(allJsonPath, JSON.stringify(allDataBundle, null, 2), 'utf8');

  console.log('\n=== TRÍCH XUẤT HOÀN TẤT ===');
  console.log(`- Schema SQL : ${schemaPath}`);
  console.log(`- Seed SQL   : ${seedPath}`);
  console.log(`- JSON tổng  : ${allJsonPath}`);
  console.log(`- JSON bảng  : ${JSON_DIR} (${orderedTables.length} files)`);
  console.log(`- CSV bảng   : ${CSV_DIR} (${orderedTables.length} files)`);
  console.log(`\nThống kê số dòng từng bảng (Tổng: ${totalRows} dòng / ${orderedTables.length} bảng):`);
  for (const t of orderedTables) {
    console.log(`  • ${t.padEnd(24, ' ')} : ${tableCounts[t]} dòng`);
  }

  await db.pool.end();
};

run().catch(async (err) => {
  console.error('Lỗi khi xuất CSDL:', err);
  await db.pool.end().catch(() => {});
  process.exit(1);
});
