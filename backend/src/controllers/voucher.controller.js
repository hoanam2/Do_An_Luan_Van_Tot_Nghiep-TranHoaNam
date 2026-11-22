const db = require('../config/db');
const { ROLES } = require('../middlewares/auth.middleware');
const { assertHotelOwnership } = require('./hotel.controller');

const ALLOWED_DISCOUNT_TYPES = ['PHAN_TRAM', 'SO_TIEN'];
let voucherHotelColumnReady = false;

/**
 * Đảm bảo bảng khuyen_mai có cột id_khachsan (nullable) để phân biệt:
 * - id_khachsan IS NULL: Voucher toàn sàn (Admin tạo)
 * - id_khachsan IS NOT NULL: Voucher riêng của khách sạn (Vendor chủ khách sạn tạo)
 */
const ensureVoucherHotelColumn = async () => {
  if (voucherHotelColumnReady) return true;
  const check = await db.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'khuyen_mai'
         AND column_name = 'id_khachsan'
     ) AS has_col`
  );
  if (!check.rows[0]?.has_col) {
    await db.query(
      'ALTER TABLE khuyen_mai ADD COLUMN IF NOT EXISTS id_khachsan BIGINT REFERENCES khach_san(id_khachsan) ON DELETE CASCADE'
    );
  }
  voucherHotelColumnReady = true;
  return true;
};

/**
 * Helper dùng chung (cả cho API kiểm tra voucher và tạo đơn đặt phòng).
 */
const calculateVoucherDiscount = (voucher, subtotal) => {
  const amount = Math.max(0, Number(subtotal) || 0);
  const type = String(voucher.loai_giamgia || '').trim().toUpperCase();
  const value = Number(voucher.gia_tri_giam) || 0;

  let discount = 0;
  if (type === 'PHAN_TRAM') {
    discount = Math.round((amount * Math.min(100, Math.max(0, value))) / 100);
  } else {
    discount = Math.min(amount, Math.max(0, value));
  }

  return {
    tam_tinh: amount,
    so_tien_giam: discount,
    tong_sau_giam: Math.max(0, amount - discount),
  };
};

const formatVoucher = (row) => ({
  id_khuyenmai: Number(row.id_khuyenmai),
  id_khachsan: row.id_khachsan ? Number(row.id_khachsan) : null,
  ten_khachsan: row.ten_khachsan || null,
  ma_voucher: row.ma_voucher,
  loai_giamgia: row.loai_giamgia,
  gia_tri_giam: Number(row.gia_tri_giam),
  ngay_batdau: row.ngay_batdau,
  ngay_ketthuc: row.ngay_ketthuc,
});

/**
 * GET /api/vouchers
 * Trả về các voucher còn hiệu lực (tùy chọn lọc theo ?id_khachsan=... để lấy voucher toàn sàn + voucher riêng của khách sạn đó).
 */
const listVouchers = async (req, res, next) => {
  try {
    await ensureVoucherHotelColumn();
    const showAll =
      String(req.query.all).toLowerCase() === 'true' && req.user?.vai_tro === ROLES.ADMIN;
    const hotelId = req.query.id_khachsan ? Number(req.query.id_khachsan) : null;

    const conditions = [];
    const params = [];

    if (!showAll) {
      conditions.push('NOW() >= km.ngay_batdau AND NOW() <= km.ngay_ketthuc');
    }

    if (hotelId) {
      params.push(hotelId);
      conditions.push(`(km.id_khachsan IS NULL OR km.id_khachsan = $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT km.*, ks.ten_khachsan
       FROM khuyen_mai km
       LEFT JOIN khach_san ks ON ks.id_khachsan = km.id_khachsan
       ${whereClause}
       ORDER BY km.id_khuyenmai DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map(formatVoucher),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/vouchers/vendor/my-vouchers (Vendor / Admin)
 * Liệt kê toàn bộ voucher thuộc các khách sạn của nhà cung cấp đang đăng nhập.
 */
const listVendorVouchers = async (req, res, next) => {
  try {
    await ensureVoucherHotelColumn();
    if (!req.user.ho_so_ncc && req.user.vai_tro !== ROLES.ADMIN) {
      return res.status(404).json({ success: false, message: 'Chưa có hồ sơ nhà cung cấp.' });
    }

    const params = [];
    let whereClause = 'WHERE km.id_khachsan IS NOT NULL';

    if (req.user.vai_tro !== ROLES.ADMIN) {
      params.push(req.user.ho_so_ncc.id_ncc);
      whereClause = 'WHERE ks.id_ncc = $1';
    }

    if (req.query.id_khachsan) {
      params.push(Number(req.query.id_khachsan));
      whereClause += ` AND km.id_khachsan = $${params.length}`;
    }

    const result = await db.query(
      `SELECT km.*, ks.ten_khachsan
       FROM khuyen_mai km
       INNER JOIN khach_san ks ON ks.id_khachsan = km.id_khachsan
       ${whereClause}
       ORDER BY km.id_khuyenmai DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map(formatVoucher),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/vouchers/validate
 * Kiểm tra mã voucher (bao gồm kiểm tra đúng khách sạn nếu là voucher riêng của khách sạn).
 */
const validateVoucher = async (req, res, next) => {
  try {
    await ensureVoucherHotelColumn();
    const code = String(req.body.ma_voucher || '').trim().toUpperCase();
    const subtotal = Number(req.body.tam_tinh || 0);
    const hotelId = req.body.id_khachsan ? Number(req.body.id_khachsan) : null;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập ma_voucher.',
      });
    }

    const result = await db.query(
      `SELECT km.*, ks.ten_khachsan
       FROM khuyen_mai km
       LEFT JOIN khach_san ks ON ks.id_khachsan = km.id_khachsan
       WHERE UPPER(km.ma_voucher) = $1
       LIMIT 1`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Mã khuyến mãi "${code}" không tồn tại.`,
      });
    }

    const voucher = result.rows[0];
    if (voucher.id_khachsan && hotelId && Number(voucher.id_khachsan) !== hotelId) {
      return res.status(400).json({
        success: false,
        message: `Mã "${code}" chỉ áp dụng riêng cho khách sạn "${voucher.ten_khachsan || `#${voucher.id_khachsan}`}".`,
      });
    }

    const now = new Date();
    if (now < new Date(voucher.ngay_batdau)) {
      return res.status(400).json({
        success: false,
        message: 'Mã khuyến mãi chưa đến thời gian áp dụng.',
      });
    }
    if (now > new Date(voucher.ngay_ketthuc)) {
      return res.status(400).json({
        success: false,
        message: 'Mã khuyến mãi đã hết hạn sử dụng.',
      });
    }

    const preview = calculateVoucherDiscount(voucher, subtotal);

    return res.status(200).json({
      success: true,
      message: 'Mã khuyến mãi hợp lệ.',
      data: {
        voucher: formatVoucher(voucher),
        ...preview,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/vouchers (Admin tạo toàn sàn/theo khách sạn; Vendor đã duyệt tạo cho khách sạn của mình)
 */
const createVoucher = async (req, res, next) => {
  try {
    await ensureVoucherHotelColumn();
    const {
      id_khachsan = null,
      ma_voucher,
      loai_giamgia,
      gia_tri_giam,
      ngay_batdau,
      ngay_ketthuc,
    } = req.body;

    const code = String(ma_voucher || '').trim().toUpperCase();
    const type = String(loai_giamgia || '').trim().toUpperCase();
    const value = Number(gia_tri_giam);
    const targetHotelId = id_khachsan ? Number(id_khachsan) : null;

    if (req.user.vai_tro === ROLES.ADMIN) {
      if (targetHotelId) {
        return res.status(403).json({
          success: false,
          message:
            'Quản trị viên chỉ tạo voucher toàn sàn (không tạo voucher riêng thay cho khách sạn đối tác).',
        });
      }
    } else {
      if (!targetHotelId) {
        return res.status(400).json({
          success: false,
          message: 'Nhà cung cấp bắt buộc phải chọn id_khachsan thuộc quyền quản lý của mình.',
        });
      }
      await assertHotelOwnership(targetHotelId, req.user);
    }

    if (!code || !type || gia_tri_giam === undefined || !ngay_batdau || !ngay_ketthuc) {
      return res.status(400).json({
        success: false,
        message:
          'Vui lòng nhập đầy đủ: ma_voucher, loai_giamgia, gia_tri_giam, ngay_batdau, ngay_ketthuc.',
      });
    }

    if (!ALLOWED_DISCOUNT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `loai_giamgia chỉ chấp nhận: ${ALLOWED_DISCOUNT_TYPES.join(', ')}.`,
      });
    }

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ success: false, message: 'gia_tri_giam phải lớn hơn 0.' });
    }

    if (type === 'PHAN_TRAM' && value > 100) {
      return res.status(400).json({
        success: false,
        message: 'Giảm giá theo PHAN_TRAM không được vượt quá 100%.',
      });
    }

    const startDate = new Date(ngay_batdau);
    const endDate = new Date(ngay_ketthuc);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian không hợp lệ (ngay_ketthuc phải lớn hơn ngay_batdau).',
      });
    }

    const dup = await db.query(
      'SELECT id_khuyenmai FROM khuyen_mai WHERE UPPER(ma_voucher) = $1 LIMIT 1',
      [code]
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Mã khuyến mãi "${code}" đã tồn tại.`,
      });
    }

    const inserted = await db.query(
      `INSERT INTO khuyen_mai (id_khachsan, ma_voucher, loai_giamgia, gia_tri_giam, ngay_batdau, ngay_ketthuc)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [targetHotelId, code, type, value, startDate.toISOString(), endDate.toISOString()]
    );

    return res.status(201).json({
      success: true,
      message: 'Tạo mã khuyến mãi thành công.',
      data: formatVoucher(inserted.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/vouchers/:id (Admin hoặc Vendor chủ khách sạn của voucher đó)
 */
const updateVoucher = async (req, res, next) => {
  try {
    await ensureVoucherHotelColumn();
    const voucherId = Number(req.params.id);
    const existing = await db.query(
      'SELECT * FROM khuyen_mai WHERE id_khuyenmai = $1 LIMIT 1',
      [voucherId]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã khuyến mãi.' });
    }

    const current = existing.rows[0];
    if (req.user.vai_tro === ROLES.ADMIN) {
      if (current.id_khachsan) {
        return res.status(403).json({
          success: false,
          message: 'Quản trị viên không được chỉnh sửa voucher riêng của khách sạn đối tác.',
        });
      }
    } else {
      if (!current.id_khachsan) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chỉnh sửa voucher toàn sàn của hệ thống.',
        });
      }
      await assertHotelOwnership(Number(current.id_khachsan), req.user);
    }

    const nextCode =
      req.body.ma_voucher !== undefined
        ? String(req.body.ma_voucher).trim().toUpperCase()
        : current.ma_voucher;
    const nextType =
      req.body.loai_giamgia !== undefined
        ? String(req.body.loai_giamgia).trim().toUpperCase()
        : current.loai_giamgia;
    const nextValue =
      req.body.gia_tri_giam !== undefined
        ? Number(req.body.gia_tri_giam)
        : Number(current.gia_tri_giam);
    const nextStart =
      req.body.ngay_batdau !== undefined ? new Date(req.body.ngay_batdau) : new Date(current.ngay_batdau);
    const nextEnd =
      req.body.ngay_ketthuc !== undefined ? new Date(req.body.ngay_ketthuc) : new Date(current.ngay_ketthuc);

    if (!ALLOWED_DISCOUNT_TYPES.includes(nextType)) {
      return res.status(400).json({
        success: false,
        message: `loai_giamgia chỉ chấp nhận: ${ALLOWED_DISCOUNT_TYPES.join(', ')}.`,
      });
    }
    if (!Number.isFinite(nextValue) || nextValue <= 0 || (nextType === 'PHAN_TRAM' && nextValue > 100)) {
      return res.status(400).json({ success: false, message: 'gia_tri_giam không hợp lệ.' });
    }
    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextEnd <= nextStart) {
      return res.status(400).json({
        success: false,
        message: 'ngay_ketthuc phải lớn hơn ngay_batdau.',
      });
    }

    const updated = await db.query(
      `UPDATE khuyen_mai
       SET ma_voucher = $1, loai_giamgia = $2, gia_tri_giam = $3, ngay_batdau = $4, ngay_ketthuc = $5
       WHERE id_khuyenmai = $6
       RETURNING *`,
      [nextCode, nextType, nextValue, nextStart.toISOString(), nextEnd.toISOString(), voucherId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật mã khuyến mãi thành công.',
      data: formatVoucher(updated.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/vouchers/:id (Admin hoặc Vendor chủ khách sạn)
 */
const deleteVoucher = async (req, res, next) => {
  try {
    await ensureVoucherHotelColumn();
    const voucherId = Number(req.params.id);
    const existing = await db.query(
      'SELECT id_khuyenmai, id_khachsan FROM khuyen_mai WHERE id_khuyenmai = $1 LIMIT 1',
      [voucherId]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã khuyến mãi.' });
    }

    if (req.user.vai_tro === ROLES.ADMIN) {
      if (existing.rows[0].id_khachsan) {
        return res.status(403).json({
          success: false,
          message: 'Quản trị viên không được xóa voucher riêng của khách sạn đối tác.',
        });
      }
    } else {
      if (!existing.rows[0].id_khachsan) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa voucher toàn sàn.',
        });
      }
      await assertHotelOwnership(Number(existing.rows[0].id_khachsan), req.user);
    }

    await db.query('DELETE FROM khuyen_mai WHERE id_khuyenmai = $1', [voucherId]);
    return res.status(200).json({
      success: true,
      message: 'Xóa mã khuyến mãi thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  ensureVoucherHotelColumn,
  calculateVoucherDiscount,
  listVouchers,
  listVendorVouchers,
  validateVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
};
