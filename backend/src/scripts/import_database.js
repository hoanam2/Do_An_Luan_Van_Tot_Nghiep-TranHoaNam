/**
 * Script khởi tạo & nạp toàn bộ CSDL StayWithUs từ:
 *   1) database/schema.sql
 *   2) database/seed_data.sql
 *
 * Dùng khi triển khai sang máy mới mà không cần cài lệnh psql.
 *
 * Cách chạy:
 *   npm --prefix backend run db:import
 *   npm --prefix backend run db:import -- --reset   (XÓA toàn bộ schema public rồi tạo lại từ đầu)
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const SCHEMA_FILE = path.join(ROOT_DIR, 'database', 'schema.sql');
const SEED_FILE = path.join(ROOT_DIR, 'database', 'seed_data.sql');

const run = async () => {
  const shouldReset = process.argv.includes('--reset');

  if (!fs.existsSync(SCHEMA_FILE)) {
    throw new Error(`Không tìm thấy file schema: ${SCHEMA_FILE}`);
  }
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error(`Không tìm thấy file dữ liệu: ${SEED_FILE}`);
  }

  const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
  const seedSql = fs.readFileSync(SEED_FILE, 'utf8');

  if (shouldReset) {
    console.log('⚠️  Đang làm sạch schema public (--reset)...');
    await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  console.log('1/2 Đang khởi tạo cấu trúc bảng, khóa ngoại, index & hàm từ database/schema.sql...');
  await db.query(schemaSql);

  console.log('2/2 Đang nạp toàn bộ dữ liệu thực tế từ database/seed_data.sql...');
  await db.query(seedSql);

  const countRes = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log(`✅ Khởi tạo & nạp dữ liệu thành công (${countRes.rowCount} bảng trong PostgreSQL)!`);

  await db.pool.end();
};

run().catch(async (err) => {
  console.error('❌ Lỗi khi import CSDL:', err.message);
  await db.pool.end().catch(() => {});
  process.exit(1);
});
