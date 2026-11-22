const db = require('../config/db');
const { ROLES } = require('../middlewares/auth.middleware');

let eventsTableReady = false;

/**
 * Tự động khởi tạo bảng su_kien_dac_quyen (idempotent) phục vụ quản trị sự kiện đặc quyền khách hàng.
 */
const ensureEventsTable = async () => {
  if (eventsTableReady) return true;

  await db.query(`
    CREATE TABLE IF NOT EXISTS su_kien_dac_quyen (
      id_sukien BIGSERIAL PRIMARY KEY,
      tieu_de VARCHAR(200) NOT NULL,
      mo_ta TEXT NOT NULL,
      doi_tuong VARCHAR(60) NOT NULL DEFAULT 'TAT_CA',
      dac_quyen VARCHAR(255) NOT NULL,
      ma_voucher_kem VARCHAR(50),
      ngay_batdau TIMESTAMPTZ NOT NULL,
      ngay_ketthuc TIMESTAMPTZ NOT NULL,
      trang_thai VARCHAR(30) NOT NULL DEFAULT 'DANG_DIEN_RA',
      ngay_tao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (ngay_ketthuc > ngay_batdau)
    )
  `);

  // Khởi tạo 2 sự kiện đặc quyền mẫu nếu bảng đang trống
  const countRes = await db.query('SELECT COUNT(*)::int AS c FROM su_kien_dac_quyen');
  if (countRes.rows[0].c === 0) {
    await db.query(
      `INSERT INTO su_kien_dac_quyen (tieu_de, mo_ta, doi_tuong, dac_quyen, ma_voucher_kem, ngay_batdau, ngay_ketthuc, trang_thai)
       VALUES
         ('Đêm Hội Thành Viên StayWithUs', 'Ưu đãi độc quyền tặng mã giảm giá và miễn phí nhận phòng sớm cho khách hàng đăng nhập tài khoản StayWithUs.', 'THANH_VIEN', 'Giảm 10% tổng đơn + Ưu tiên nhận phòng sớm 2 giờ', 'WELCOME10', NOW() - INTERVAL '1 day', NOW() + INTERVAL '180 days', 'DANG_DIEN_RA'),
         ('Tuần Lễ Nghỉ Dưỡng Biển Hè VIP', 'Sự kiện đặc quyền áp dụng cho các khu nghỉ dưỡng biển 4-5 sao tại Đà Nẵng, Phú Quốc và Nha Trang.', 'KHACH_VIP', 'Giảm trực tiếp 200.000đ + Miễn phí nâng hạng phòng nếu còn trống', 'GIAM200K', NOW() - INTERVAL '1 day', NOW() + INTERVAL '120 days', 'DANG_DIEN_RA')`
    );
  }

  eventsTableReady = true;
  return true;
};

const formatEvent = (row) => ({
  id_sukien: Number(row.id_sukien),
  tieu_de: row.tieu_de,
  mo_ta: row.mo_ta,
  doi_tuong: row.doi_tuong,
  dac_quyen: row.dac_quyen,
  ma_voucher_kem: row.ma_voucher_kem || null,
  ngay_batdau: row.ngay_batdau,
  ngay_ketthuc: row.ngay_ketthuc,
  trang_thai: row.trang_thai,
  ngay_tao: row.ngay_tao,
});

/**
 * GET /api/events
 * Khách xem các sự kiện đặc quyền đang diễn ra; Admin truyền ?all=true để xem tất cả.
 */
const listEvents = async (req, res, next) => {
  try {
    await ensureEventsTable();
    const showAll =
      String(req.query.all).toLowerCase() === 'true' && req.user?.vai_tro === ROLES.ADMIN;

    const sql = showAll
      ? 'SELECT * FROM su_kien_dac_quyen ORDER BY id_sukien DESC'
      : `SELECT * FROM su_kien_dac_quyen
         WHERE UPPER(trang_thai) = 'DANG_DIEN_RA'
           AND NOW() >= ngay_batdau
           AND NOW() <= ngay_ketthuc
         ORDER BY id_sukien DESC`;

    const result = await db.query(sql);
    return res.status(200).json({
      success: true,
      data: result.rows.map(formatEvent),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/events (Admin)
 */
const createEvent = async (req, res, next) => {
  try {
    await ensureEventsTable();
    const {
      tieu_de,
      mo_ta,
      doi_tuong = 'TAT_CA',
      dac_quyen,
      ma_voucher_kem = null,
      ngay_batdau,
      ngay_ketthuc,
      trang_thai = 'DANG_DIEN_RA',
    } = req.body;

    if (
      !String(tieu_de || '').trim() ||
      !String(mo_ta || '').trim() ||
      !String(dac_quyen || '').trim() ||
      !ngay_batdau ||
      !ngay_ketthuc
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Vui lòng nhập đầy đủ thông tin sự kiện: Tiêu đề, Mô tả, Đặc quyền, Ngày bắt đầu và Ngày kết thúc.',
      });
    }

    const startDate = new Date(ngay_batdau);
    const endDate = new Date(ngay_ketthuc);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian sự kiện không hợp lệ (Ngày kết thúc phải lớn hơn Ngày bắt đầu).',
      });
    }

    const inserted = await db.query(
      `INSERT INTO su_kien_dac_quyen
         (tieu_de, mo_ta, doi_tuong, dac_quyen, ma_voucher_kem, ngay_batdau, ngay_ketthuc, trang_thai)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        String(tieu_de).trim(),
        String(mo_ta).trim(),
        String(doi_tuong).trim().toUpperCase(),
        String(dac_quyen).trim(),
        ma_voucher_kem ? String(ma_voucher_kem).trim().toUpperCase() : null,
        startDate.toISOString(),
        endDate.toISOString(),
        String(trang_thai).trim().toUpperCase(),
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Tạo sự kiện đặc quyền cho khách hàng thành công.',
      data: formatEvent(inserted.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/events/:id (Admin)
 */
const updateEvent = async (req, res, next) => {
  try {
    await ensureEventsTable();
    const eventId = Number(req.params.id);
    const existing = await db.query('SELECT * FROM su_kien_dac_quyen WHERE id_sukien = $1 LIMIT 1', [
      eventId,
    ]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện.' });
    }

    const cur = existing.rows[0];
    const nextStart =
      req.body.ngay_batdau !== undefined ? new Date(req.body.ngay_batdau) : new Date(cur.ngay_batdau);
    const nextEnd =
      req.body.ngay_ketthuc !== undefined ? new Date(req.body.ngay_ketthuc) : new Date(cur.ngay_ketthuc);

    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextEnd <= nextStart) {
      return res.status(400).json({
        success: false,
        message: 'Ngày kết thúc phải lớn hơn ngày bắt đầu.',
      });
    }

    const updated = await db.query(
      `UPDATE su_kien_dac_quyen
       SET tieu_de = $1,
           mo_ta = $2,
           doi_tuong = $3,
           dac_quyen = $4,
           ma_voucher_kem = $5,
           ngay_batdau = $6,
           ngay_ketthuc = $7,
           trang_thai = $8
       WHERE id_sukien = $9
       RETURNING *`,
      [
        req.body.tieu_de !== undefined ? String(req.body.tieu_de).trim() : cur.tieu_de,
        req.body.mo_ta !== undefined ? String(req.body.mo_ta).trim() : cur.mo_ta,
        req.body.doi_tuong !== undefined ? String(req.body.doi_tuong).trim().toUpperCase() : cur.doi_tuong,
        req.body.dac_quyen !== undefined ? String(req.body.dac_quyen).trim() : cur.dac_quyen,
        req.body.ma_voucher_kem !== undefined
          ? req.body.ma_voucher_kem
            ? String(req.body.ma_voucher_kem).trim().toUpperCase()
            : null
          : cur.ma_voucher_kem,
        nextStart.toISOString(),
        nextEnd.toISOString(),
        req.body.trang_thai !== undefined ? String(req.body.trang_thai).trim().toUpperCase() : cur.trang_thai,
        eventId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật sự kiện đặc quyền thành công.',
      data: formatEvent(updated.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/events/:id (Admin)
 */
const deleteEvent = async (req, res, next) => {
  try {
    await ensureEventsTable();
    const eventId = Number(req.params.id);
    const deleted = await db.query(
      'DELETE FROM su_kien_dac_quyen WHERE id_sukien = $1 RETURNING id_sukien',
      [eventId]
    );
    if (deleted.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Xóa sự kiện đặc quyền thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
