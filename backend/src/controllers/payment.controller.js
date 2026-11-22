const crypto = require('crypto');
const db = require('../config/db');
const { ROLES } = require('../middlewares/auth.middleware');
const { sendMail } = require('../utils/mailer');

const ALLOWED_METHODS = ['TIEN_MAT', 'CHUYEN_KHOAN', 'VNPAY', 'MOMO', 'THE_TIN_DUNG'];
const ALLOWED_PAYMENT_STATUSES = ['CHO_THANH_TOAN', 'DA_THANH_TOAN', 'THAT_BAI', 'DA_HOAN_TIEN'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateTransactionCode = (method) => {
  const prefix = String(method || 'PAY').slice(0, 4).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
};

/**
 * POST /api/payments
 * Tạo giao dịch thanh toán (thanh_toan) cho một đơn đặt phòng.
 * Body: { id_dondat, phuong_thuc }
 */
const createPayment = async (req, res, next) => {
  try {
    const bookingId = Number(req.body.id_dondat);
    const method = String(req.body.phuong_thuc || '').trim().toUpperCase();

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ success: false, message: 'id_dondat không hợp lệ.' });
    }

    if (!ALLOWED_METHODS.includes(method)) {
      return res.status(400).json({
        success: false,
        message: `phuong_thuc không hợp lệ. Chỉ chấp nhận: ${ALLOWED_METHODS.join(', ')}.`,
      });
    }

    const payment = await db.withTransaction(async (client) => {
      const bookingRes = await client.query(
        `SELECT ddp.*, ncc.id_nguoidung AS vendor_user_id
         FROM don_dat_phong ddp
         INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
         INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
         WHERE ddp.id_dondat = $1
         FOR UPDATE OF ddp`,
        [bookingId]
      );

      if (bookingRes.rowCount === 0) {
        const err = new Error('Không tìm thấy đơn đặt phòng.');
        err.statusCode = 404;
        throw err;
      }

      const booking = bookingRes.rows[0];
      const canPay =
        req.user.vai_tro === ROLES.ADMIN ||
        Number(booking.id_nguoidung) === Number(req.user.id_nguoidung) ||
        Number(booking.vendor_user_id) === Number(req.user.id_nguoidung);

      if (!canPay) {
        const err = new Error('Bạn không có quyền thanh toán cho đơn đặt phòng này.');
        err.statusCode = 403;
        throw err;
      }

      const bookingStatus = String(booking.trang_thai_don).toUpperCase();
      if (['DA_HUY', 'TU_CHOI'].includes(bookingStatus)) {
        const err = new Error(`Đơn đặt phòng đang ở trạng thái "${bookingStatus}", không thể thanh toán.`);
        err.statusCode = 400;
        throw err;
      }

      // Kiểm tra đơn đã được thanh toán thành công trước đó chưa
      const paidCheck = await client.query(
        `SELECT id_thanhtoan FROM thanh_toan
         WHERE id_dondat = $1 AND UPPER(trang_thai_tt) = 'DA_THANH_TOAN'
         LIMIT 1`,
        [bookingId]
      );
      if (paidCheck.rowCount > 0) {
        const err = new Error('Đơn đặt phòng này đã được thanh toán hoàn tất trước đó.');
        err.statusCode = 409;
        throw err;
      }

      const txnCode = generateTransactionCode(method);
      const inserted = await client.query(
        `INSERT INTO thanh_toan (id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt)
         VALUES ($1, $2, $3, $4, 'CHO_THANH_TOAN')
         RETURNING *`,
        [bookingId, method, Number(booking.tong_tien), txnCode]
      );

      return inserted.rows[0];
    });

    return res.status(201).json({
      success: true,
      message: 'Khởi tạo giao dịch thanh toán thành công.',
      data: {
        ...payment,
        id_thanhtoan: Number(payment.id_thanhtoan),
        id_dondat: Number(payment.id_dondat),
        so_tien: Number(payment.so_tien),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/payments/:id/confirm
 * Xác nhận kết quả thanh toán (DA_THANH_TOAN / THAT_BAI / DA_HOAN_TIEN).
 * Khi DA_THANH_TOAN và đơn đang CHO_XAC_NHAN -> tự động chuyển đơn sang DA_XAC_NHAN.
 */
const confirmPayment = async (req, res, next) => {
  try {
    const paymentId = Number(req.params.id);
    const nextStatus = String(req.body.trang_thai_tt || 'DA_THANH_TOAN').trim().toUpperCase();
    const externalTxnCode = req.body.ma_giao_dich ? String(req.body.ma_giao_dich).trim() : null;

    if (!ALLOWED_PAYMENT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `trang_thai_tt không hợp lệ. Chỉ chấp nhận: ${ALLOWED_PAYMENT_STATUSES.join(', ')}.`,
      });
    }

    const updated = await db.withTransaction(async (client) => {
      const payRes = await client.query(
        `SELECT tt.*, ddp.id_nguoidung AS booking_user_id, ddp.trang_thai_don, ncc.id_nguoidung AS vendor_user_id
         FROM thanh_toan tt
         INNER JOIN don_dat_phong ddp ON ddp.id_dondat = tt.id_dondat
         INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
         INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
         WHERE tt.id_thanhtoan = $1
         FOR UPDATE OF tt`,
        [paymentId]
      );

      if (payRes.rowCount === 0) {
        const err = new Error('Không tìm thấy giao dịch thanh toán.');
        err.statusCode = 404;
        throw err;
      }

      const payment = payRes.rows[0];
      const isVendorOrAdmin =
        req.user.vai_tro === ROLES.ADMIN ||
        Number(payment.vendor_user_id) === Number(req.user.id_nguoidung);
      const isOwner = Number(payment.booking_user_id) === Number(req.user.id_nguoidung);

      // Hoàn tiền chỉ Admin hoặc Vendor mới được xác nhận; thanh toán online giả lập (VNPAY/MOMO/...) cho phép chủ đơn xác nhận khi demo
      if (nextStatus === 'DA_HOAN_TIEN' && !isVendorOrAdmin) {
        const err = new Error('Chỉ nhà cung cấp hoặc quản trị viên mới có quyền xác nhận hoàn tiền.');
        err.statusCode = 403;
        throw err;
      }

      if (!isVendorOrAdmin && !isOwner) {
        const err = new Error('Bạn không có quyền xác nhận giao dịch thanh toán này.');
        err.statusCode = 403;
        throw err;
      }

      const updateRes = await client.query(
        `UPDATE thanh_toan
         SET trang_thai_tt = $1,
             ma_giao_dich = COALESCE($2, ma_giao_dich)
         WHERE id_thanhtoan = $3
         RETURNING *`,
        [nextStatus, externalTxnCode, paymentId]
      );

      // Tự động xác nhận đơn đặt phòng nếu thanh toán thành công và đơn đang chờ xác nhận
      if (
        nextStatus === 'DA_THANH_TOAN' &&
        String(payment.trang_thai_don).toUpperCase() === 'CHO_XAC_NHAN'
      ) {
        await client.query(
          `UPDATE don_dat_phong
           SET trang_thai_don = 'DA_XAC_NHAN'
           WHERE id_dondat = $1`,
          [payment.id_dondat]
        );
      }

      return updateRes.rows[0];
    });

    return res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái thanh toán thành "${nextStatus}".`,
      data: {
        ...updated,
        id_thanhtoan: Number(updated.id_thanhtoan),
        id_dondat: Number(updated.id_dondat),
        so_tien: Number(updated.so_tien),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/payments/booking/:bookingId
 */
const listPaymentsByBooking = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const checkRes = await db.query(
      `SELECT ddp.id_nguoidung, ncc.id_nguoidung AS vendor_user_id
       FROM don_dat_phong ddp
       INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
       INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
       WHERE ddp.id_dondat = $1
       LIMIT 1`,
      [bookingId]
    );

    if (checkRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt phòng.' });
    }

    const row = checkRes.rows[0];
    const isAllowed =
      req.user.vai_tro === ROLES.ADMIN ||
      Number(row.id_nguoidung) === Number(req.user.id_nguoidung) ||
      Number(row.vendor_user_id) === Number(req.user.id_nguoidung);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thông tin thanh toán của đơn này.',
      });
    }

    const result = await db.query(
      `SELECT
         tt.*,
         hd.id_hoadon,
         hd.ma_so_thue,
         hd.ten_cong_ty,
         hd.email_nhan_hd,
         hd.ngay_xuat
       FROM thanh_toan tt
       LEFT JOIN hoa_don hd ON hd.id_thanhtoan = tt.id_thanhtoan
       WHERE tt.id_dondat = $1
       ORDER BY tt.id_thanhtoan DESC`,
      [bookingId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((p) => ({
        id_thanhtoan: Number(p.id_thanhtoan),
        id_dondat: Number(p.id_dondat),
        phuong_thuc: p.phuong_thuc,
        so_tien: Number(p.so_tien),
        ma_giao_dich: p.ma_giao_dich,
        trang_thai_tt: p.trang_thai_tt,
        hoa_don: p.id_hoadon
          ? {
              id_hoadon: Number(p.id_hoadon),
              ma_so_thue: p.ma_so_thue,
              ten_cong_ty: p.ten_cong_ty,
              email_nhan_hd: p.email_nhan_hd,
              ngay_xuat: p.ngay_xuat,
            }
          : null,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================
// HÓA ĐƠN VAT (hoa_don)
// ============================================

/**
 * POST /api/payments/:paymentId/invoice
 * Xuất hóa đơn điện tử VAT cho giao dịch đã thanh toán thành công (DA_THANH_TOAN).
 */
const createInvoice = async (req, res, next) => {
  try {
    const paymentId = Number(req.params.paymentId);
    const { ma_so_thue, ten_cong_ty, email_nhan_hd } = req.body;

    if (
      !String(ma_so_thue || '').trim() ||
      !String(ten_cong_ty || '').trim() ||
      !String(email_nhan_hd || '').trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: ma_so_thue, ten_cong_ty, email_nhan_hd.',
      });
    }

    const invoiceEmail = String(email_nhan_hd).trim().toLowerCase();
    if (!EMAIL_REGEX.test(invoiceEmail)) {
      return res.status(400).json({ success: false, message: 'email_nhan_hd không hợp lệ.' });
    }

    const payRes = await db.query(
      `SELECT tt.*, ddp.id_nguoidung AS booking_user_id, ks.ten_khachsan, ncc.id_nguoidung AS vendor_user_id
       FROM thanh_toan tt
       INNER JOIN don_dat_phong ddp ON ddp.id_dondat = tt.id_dondat
       INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
       INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
       WHERE tt.id_thanhtoan = $1
       LIMIT 1`,
      [paymentId]
    );

    if (payRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch thanh toán.' });
    }

    const payment = payRes.rows[0];
    const isAllowed =
      req.user.vai_tro === ROLES.ADMIN ||
      Number(payment.booking_user_id) === Number(req.user.id_nguoidung) ||
      Number(payment.vendor_user_id) === Number(req.user.id_nguoidung);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xuất hóa đơn cho giao dịch này.',
      });
    }

    if (String(payment.trang_thai_tt).toUpperCase() !== 'DA_THANH_TOAN') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ được xuất hóa đơn VAT cho giao dịch đã thanh toán thành công (DA_THANH_TOAN).',
      });
    }

    const dupCheck = await db.query(
      'SELECT id_hoadon FROM hoa_don WHERE id_thanhtoan = $1 LIMIT 1',
      [paymentId]
    );
    if (dupCheck.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Giao dịch thanh toán này đã được xuất hóa đơn trước đó.',
      });
    }

    const inserted = await db.query(
      `INSERT INTO hoa_don (id_thanhtoan, ma_so_thue, ten_cong_ty, email_nhan_hd)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [paymentId, String(ma_so_thue).trim(), String(ten_cong_ty).trim(), invoiceEmail]
    );

    const invoice = inserted.rows[0];

    sendMail({
      to: invoiceEmail,
      subject: `[StayWithUs] Hóa đơn điện tử #${invoice.id_hoadon} - ${payment.ten_khachsan}`,
      text: `Hóa đơn #${invoice.id_hoadon} cho đơn vị ${invoice.ten_cong_ty} (MST: ${invoice.ma_so_thue}), số tiền: ${Number(payment.so_tien).toLocaleString('vi-VN')} VNĐ, mã giao dịch: ${payment.ma_giao_dich}.`,
      html: `<h3>Hóa đơn điện tử #${invoice.id_hoadon}</h3>
             <p><strong>Đơn vị mua hàng:</strong> ${invoice.ten_cong_ty}</p>
             <p><strong>Mã số thuế:</strong> ${invoice.ma_so_thue}</p>
             <p><strong>Khách sạn:</strong> ${payment.ten_khachsan}</p>
             <p><strong>Mã giao dịch:</strong> ${payment.ma_giao_dich}</p>
             <p><strong>Tổng tiền thanh toán:</strong> ${Number(payment.so_tien).toLocaleString('vi-VN')} VNĐ</p>`,
    }).catch((err) => console.warn('[Mailer] Không gửi được email hóa đơn:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Xuất hóa đơn VAT thành công.',
      data: {
        ...invoice,
        id_hoadon: Number(invoice.id_hoadon),
        id_thanhtoan: Number(invoice.id_thanhtoan),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/payments/invoices/my
 */
const listMyInvoices = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         hd.*,
         tt.id_dondat,
         tt.phuong_thuc,
         tt.so_tien,
         tt.ma_giao_dich,
         ks.ten_khachsan
       FROM hoa_don hd
       INNER JOIN thanh_toan tt ON tt.id_thanhtoan = hd.id_thanhtoan
       INNER JOIN don_dat_phong ddp ON ddp.id_dondat = tt.id_dondat
       INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
       WHERE ddp.id_nguoidung = $1
       ORDER BY hd.ngay_xuat DESC`,
      [req.user.id_nguoidung]
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        id_hoadon: Number(r.id_hoadon),
        id_thanhtoan: Number(r.id_thanhtoan),
        id_dondat: Number(r.id_dondat),
        so_tien: Number(r.so_tien),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/payments/invoices/:id
 */
const getInvoiceById = async (req, res, next) => {
  try {
    const invoiceId = Number(req.params.id);
    const result = await db.query(
      `SELECT
         hd.*,
         tt.id_dondat,
         tt.phuong_thuc,
         tt.so_tien,
         tt.ma_giao_dich,
         tt.trang_thai_tt,
         ddp.id_nguoidung AS booking_user_id,
         ddp.ngay_nhan_phong,
         ddp.ngay_tra_phong,
         ks.ten_khachsan,
         ks.dia_chi,
         ncc.id_nguoidung AS vendor_user_id,
         ncc.ten_doanh_nghiep AS ncc_ten_doanh_nghiep,
         ncc.ma_so_thue AS ncc_ma_so_thue
       FROM hoa_don hd
       INNER JOIN thanh_toan tt ON tt.id_thanhtoan = hd.id_thanhtoan
       INNER JOIN don_dat_phong ddp ON ddp.id_dondat = tt.id_dondat
       INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
       INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
       WHERE hd.id_hoadon = $1
       LIMIT 1`,
      [invoiceId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn.' });
    }

    const row = result.rows[0];
    const isAllowed =
      req.user.vai_tro === ROLES.ADMIN ||
      Number(row.booking_user_id) === Number(req.user.id_nguoidung) ||
      Number(row.vendor_user_id) === Number(req.user.id_nguoidung);

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hóa đơn này.' });
    }

    const { booking_user_id, vendor_user_id, ...safeData } = row;
    return res.status(200).json({
      success: true,
      data: {
        ...safeData,
        id_hoadon: Number(safeData.id_hoadon),
        id_thanhtoan: Number(safeData.id_thanhtoan),
        id_dondat: Number(safeData.id_dondat),
        so_tien: Number(safeData.so_tien),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/payments/admin/all (Admin)
 * Quản lý toàn bộ giao dịch thanh toán & hóa đơn VAT trên toàn hệ thống.
 */
const listAllPaymentsAdmin = async (req, res, next) => {
  try {
    const { trang_thai_tt, phuong_thuc, keyword } = req.query;
    const conditions = [];
    const params = [];

    if (trang_thai_tt) {
      params.push(String(trang_thai_tt).trim().toUpperCase());
      conditions.push(`UPPER(tt.trang_thai_tt) = $${params.length}`);
    }
    if (phuong_thuc) {
      params.push(String(phuong_thuc).trim().toUpperCase());
      conditions.push(`UPPER(tt.phuong_thuc) = $${params.length}`);
    }
    if (keyword) {
      params.push(`%${String(keyword).trim()}%`);
      conditions.push(
        `(tt.ma_giao_dich ILIKE $${params.length} OR nd.ho_ten ILIKE $${params.length} OR nd.email ILIKE $${params.length} OR ks.ten_khachsan ILIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT
         tt.*,
         ddp.ngay_nhan_phong,
         ddp.ngay_tra_phong,
         ddp.trang_thai_don,
         ddp.phi_hoa_hong,
         nd.id_nguoidung,
         nd.ho_ten AS khach_ho_ten,
         nd.email AS khach_email,
         ks.ten_khachsan,
         hd.id_hoadon,
         hd.ma_so_thue AS hd_ma_so_thue,
         hd.ten_cong_ty AS hd_ten_cong_ty,
         hd.email_nhan_hd,
         hd.ngay_xuat
       FROM thanh_toan tt
       INNER JOIN don_dat_phong ddp ON ddp.id_dondat = tt.id_dondat
       INNER JOIN nguoi_dung nd ON nd.id_nguoidung = ddp.id_nguoidung
       INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
       LEFT JOIN hoa_don hd ON hd.id_thanhtoan = tt.id_thanhtoan
       ${whereClause}
       ORDER BY tt.id_thanhtoan DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        id_thanhtoan: Number(r.id_thanhtoan),
        id_dondat: Number(r.id_dondat),
        phuong_thuc: r.phuong_thuc,
        so_tien: Number(r.so_tien),
        phi_hoa_hong: Number(r.phi_hoa_hong),
        ma_giao_dich: r.ma_giao_dich,
        trang_thai_tt: r.trang_thai_tt,
        trang_thai_don: r.trang_thai_don,
        ngay_nhan_phong: r.ngay_nhan_phong,
        ngay_tra_phong: r.ngay_tra_phong,
        khach_hang: {
          id_nguoidung: Number(r.id_nguoidung),
          ho_ten: r.khach_ho_ten,
          email: r.khach_email,
        },
        ten_khachsan: r.ten_khachsan,
        hoa_don: r.id_hoadon
          ? {
              id_hoadon: Number(r.id_hoadon),
              ma_so_thue: r.hd_ma_so_thue,
              ten_cong_ty: r.hd_ten_cong_ty,
              email_nhan_hd: r.email_nhan_hd,
              ngay_xuat: r.ngay_xuat,
            }
          : null,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createPayment,
  confirmPayment,
  listPaymentsByBooking,
  listAllPaymentsAdmin,
  createInvoice,
  listMyInvoices,
  getInvoiceById,
};
