const db = require('../config/db');

/**
 * Bổ sung cột embedding REAL[] vào bảng khach_san (idempotent)
 * để lưu vector ngữ nghĩa từ Gemini và truy vấn trực tiếp với hàm cosine_similarity(REAL[], REAL[]).
 */
const migrate = async () => {
  await db.query('ALTER TABLE khach_san ADD COLUMN IF NOT EXISTS embedding REAL[]');
  console.log('[Migrate AI] Đã sẵn sàng cột khach_san.embedding (REAL[]).');

  const fnCheck = await db.query(
    `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cosine_similarity') AS ok`
  );
  console.log(
    fnCheck.rows[0]?.ok
      ? '[Migrate AI] Xác nhận hàm cosine_similarity(REAL[], REAL[]) đã tồn tại trong PostgreSQL.'
      : '[Migrate AI] Cảnh báo: Chưa tìm thấy hàm cosine_similarity(REAL[], REAL[]). '
  );
};

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Migrate AI] Lỗi:', err.message);
    process.exit(1);
  });
