const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const isSslEnabled = String(process.env.DB_SSL).toLowerCase() === 'true';

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isSslEnabled ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hotel_booking_db',
      ssl: isSslEnabled ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({
  ...poolConfig,
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Lỗi kết nối không mong muốn trên client nhàn rỗi:', err.message);
});

/**
 * Thực thi một câu truy vấn SQL có tham số hóa (chống SQL Injection).
 * @param {string} text - Câu lệnh SQL
 * @param {Array} [params] - Danh sách tham số
 */
const query = async (text, params = []) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV === 'development' && process.env.DB_LOG_QUERIES === 'true') {
    const duration = Date.now() - start;
    console.log('[DB Query]', { text, duration: `${duration}ms`, rows: result.rowCount });
  }
  return result;
};

/**
 * Thực thi nhiều câu truy vấn trong cùng một PostgreSQL Transaction (BEGIN / COMMIT / ROLLBACK).
 * Dùng cho các nghiệp vụ liên bảng như đăng ký Vendor (nguoi_dung + ho_so_ncc) hoặc đặt phòng.
 * @param {(client: import('pg').PoolClient) => Promise<any>} callback
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Kiểm tra kết nối tới PostgreSQL và xác nhận hàm cosine_similarity(REAL[], REAL[]) đã sẵn sàng.
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    const timeRes = await client.query('SELECT NOW() AS server_time, current_database() AS db_name');
    const { server_time, db_name } = timeRes.rows[0];
    console.log(`[PostgreSQL] Kết nối thành công tới "${db_name}" lúc ${server_time}`);

    const fnCheck = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_proc
         WHERE proname = 'cosine_similarity'
       ) AS has_cosine`
    );

    if (fnCheck.rows[0]?.has_cosine) {
      console.log('[PostgreSQL] Hàm cosine_similarity(REAL[], REAL[]) đã sẵn sàng.');
    } else {
      console.warn('[PostgreSQL] Cảnh báo: Chưa tìm thấy hàm cosine_similarity trong database.');
    }

    return true;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  withTransaction,
  testConnection,
};
