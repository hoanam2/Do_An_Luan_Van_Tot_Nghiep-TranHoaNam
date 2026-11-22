const db = require('../config/db');
const { ROLES } = require('../middlewares/auth.middleware');
const { calculateVoucherDiscount } = require('./voucher.controller');
const { sendMail } = require('../utils/mailer');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const BOOKING_STATUSES = [
  'CHO_XAC_NHAN',
  'DA_XAC_NHAN',
  'DA_CHECKIN',
  'HOAN_THANH',
  'DA_HUY',
  'TU_CHOI',
];

const ALLOWED_TRANSITIONS = {
  CHO_XAC_NHAN: ['DA_XAC_NHAN', 'TU_CHOI', 'DA_HUY'],
  DA_XAC_NHAN: ['DA_CHECKIN', 'DA_HUY'],
  DA_CHECKIN: ['HOAN_THANH'],
  HOAN_THANH: [],
  DA_HUY: [],
  TU_CHOI: [],
};

const calculateNights = (checkInStr, checkOutStr) => {
  const start = new Date(`${checkInStr}T00:00:00Z`);
  const end = new Date(`${checkOutStr}T00:00:00Z`);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

/**
 * Tải chi tiết đầy đủ một đơn đặt phòng (phòng, dịch vụ, voucher, thanh toán, hóa đơn).
 */
const fetchBookingDetail = async (bookingId) => {
  const headerRes = await db.query(
    `SELECT
       ddp.*,
       nd.ho_ten AS khach_ho_ten,
       nd.email AS khach_email,
       nd.sdt AS khach_sdt,
       ks.ten_khachsan,
       ks.dia_chi AS khachsan_dia_chi,
       ks.hang_sao,
       ncc.id_ncc,
       ncc.id_nguoidung AS vendor_user_id,
       ncc.ten_doanh_nghiep,
       km.ma_voucher,
       km.loai_giamgia,
       km.gia_tri_giam
     FROM don_dat_phong ddp
     INNER JOIN nguoi_dung nd ON nd.id_nguoidung = ddp.id_nguoidung
     INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
     INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
     LEFT JOIN khuyen_mai km ON km.id_khuyenmai = ddp.id_khuyenmai
     WHERE ddp.id_dondat = $1
     LIMIT 1`,
    [bookingId]
  );

  if (headerRes.rowCount === 0) return null;
  const booking = headerRes.rows[0];

  const [roomsRes, servicesRes, paymentsRes] = await Promise.all([
    db.query(
      `SELECT
         ctdp.id_phong,
         ctdp.don_gia,
         ctdp.so_dem,
         ctdp.thanh_tien,
         p.so_phong,
         p.tang,
         p.trang_thai_phong,
         lp.id_loaiphong,
         lp.ten_loaiphong,
         lp.suc_chua
       FROM chi_tiet_dat_phong ctdp
       INNER JOIN phong p ON p.id_phong = ctdp.id_phong
       INNER JOIN loai_phong lp ON lp.id_loaiphong = p.id_loaiphong
       WHERE ctdp.id_dondat = $1
       ORDER BY p.so_phong ASC`,
      [bookingId]
    ),
    db.query(
      `SELECT
         ctdv.id_dichvu,
         ctdv.so_luong,
         ctdv.don_gia,
         (ctdv.so_luong * ctdv.don_gia)::numeric AS thanh_tien,
         dv.ten_dichvu,
         dv.don_vi_tinh
       FROM chi_tiet_dich_vu ctdv
       INNER JOIN dich_vu dv ON dv.id_dichvu = ctdv.id_dichvu
       WHERE ctdv.id_dondat = $1
       ORDER BY dv.ten_dichvu ASC`,
      [bookingId]
    ),
    db.query(
      `SELECT
         tt.*,
         hd.id_hoadon,
         hd.ma_so_thue AS hd_ma_so_thue,
         hd.ten_cong_ty AS hd_ten_cong_ty,
         hd.email_nhan_hd,
         hd.ngay_xuat
       FROM thanh_toan tt
       LEFT JOIN hoa_don hd ON hd.id_thanhtoan = tt.id_thanhtoan
       WHERE tt.id_dondat = $1
       ORDER BY tt.id_thanhtoan DESC`,
      [bookingId]
    ),
  ]);

  return {
    id_dondat: Number(booking.id_dondat),
    id_nguoidung: Number(booking.id_nguoidung),
    id_khachsan: Number(booking.id_khachsan),
    id_khuyenmai: booking.id_khuyenmai ? Number(booking.id_khuyenmai) : null,
    ngay_nhan_phong: booking.ngay_nhan_phong,
    ngay_tra_phong: booking.ngay_tra_phong,
    tong_tien: Number(booking.tong_tien),
    phi_hoa_hong: Number(booking.phi_hoa_hong),
    trang_thai_don: booking.trang_thai_don,
    vendor_user_id: Number(booking.vendor_user_id),
    khach_hang: {
      id_nguoidung: Number(booking.id_nguoidung),
      ho_ten: booking.khach_ho_ten,
      email: booking.khach_email,
      sdt: booking.khach_sdt,
    },
    khach_san: {
      id_khachsan: Number(booking.id_khachsan),
      ten_khachsan: booking.ten_khachsan,
      dia_chi: booking.khachsan_dia_chi,
      hang_sao: booking.hang_sao,
      ten_doanh_nghiep: booking.ten_doanh_nghiep,
    },
    khuyen_mai: booking.id_khuyenmai
      ? {
          id_khuyenmai: Number(booking.id_khuyenmai),
          ma_voucher: booking.ma_voucher,
          loai_giamgia: booking.loai_giamgia,
          gia_tri_giam: Number(booking.gia_tri_giam),
        }
      : null,
    chi_tiet_phong: roomsRes.rows.map((r) => ({
      id_phong: Number(r.id_phong),
      id_loaiphong: Number(r.id_loaiphong),
      ten_loaiphong: r.ten_loaiphong,
      so_phong: r.so_phong,
      tang: r.tang,
      suc_chua: r.suc_chua,
      trang_thai_phong: r.trang_thai_phong,
      don_gia: Number(r.don_gia),
      so_dem: r.so_dem,
      thanh_tien: Number(r.thanh_tien),
    })),
    chi_tiet_dich_vu: servicesRes.rows.map((s) => ({
      id_dichvu: Number(s.id_dichvu),
      ten_dichvu: s.ten_dichvu,
      don_vi_tinh: s.don_vi_tinh,
      so_luong: s.so_luong,
      don_gia: Number(s.don_gia),
      thanh_tien: Number(s.thanh_tien),
    })),
    thanh_toan: paymentsRes.rows.map((p) => ({
      id_thanhtoan: Number(p.id_thanhtoan),
      phuong_thuc: p.phuong_thuc,
      so_tien: Number(p.so_tien),
      ma_giao_dich: p.ma_giao_dich,
      trang_thai_tt: p.trang_thai_tt,
      hoa_don: p.id_hoadon
        ? {
            id_hoadon: Number(p.id_hoadon),
            ma_so_thue: p.hd_ma_so_thue,
            ten_cong_ty: p.hd_ten_cong_ty,
            email_nhan_hd: p.email_nhan_hd,
            ngay_xuat: p.ngay_xuat,
          }
        : null,
    })),
  };
};

/**
 * POST /api/bookings
 * Tạo đơn đặt phòng trọn gói trong PostgreSQL Transaction có khóa hàng (FOR UPDATE) chống đặt trùng phòng.
 * Body: { id_khachsan, ngay_nhan_phong, ngay_tra_phong, phong_ids: [1, 2], dich_vu?: [{ id_dichvu, so_luong }], ma_voucher? }
 */
const createBooking = async (req, res, next) => {
  try {
    const {
      id_khachsan,
      ngay_nhan_phong,
      ngay_tra_phong,
      phong_ids = [],
      dich_vu = [],
      ma_voucher = null,
    } = req.body;

    const hotelId = Number(id_khachsan);
    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return res.status(400).json({ success: false, message: 'id_khachsan không hợp lệ.' });
    }

    if (
      !DATE_REGEX.test(String(ngay_nhan_phong || '')) ||
      !DATE_REGEX.test(String(ngay_tra_phong || ''))
    ) {
      return res.status(400).json({
        success: false,
        message: 'ngay_nhan_phong và ngay_tra_phong phải theo định dạng YYYY-MM-DD.',
      });
    }

    const nights = calculateNights(ngay_nhan_phong, ngay_tra_phong);
    if (nights <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ngay_tra_phong phải lớn hơn ngay_nhan_phong ít nhất 1 đêm.',
      });
    }

    const uniqueRoomIds = [
      ...new Set(
        (Array.isArray(phong_ids) ? phong_ids : [])
          .map((id) => Number(id))
          .filter((n) => Number.isInteger(n) && n > 0)
      ),
    ];

    if (uniqueRoomIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất 1 phòng (phong_ids).',
      });
    }

    // Gom dịch vụ trùng id_dichvu (nếu client gửi lặp)
    const serviceQtyMap = new Map();
    if (Array.isArray(dich_vu)) {
      for (const item of dich_vu) {
        const svcId = Number(item?.id_dichvu);
        const qty = Number(item?.so_luong);
        if (!Number.isInteger(svcId) || svcId <= 0 || !Number.isInteger(qty) || qty <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Mỗi mục trong dich_vu phải có id_dichvu và so_luong là số nguyên dương.',
          });
        }
        serviceQtyMap.set(svcId, (serviceQtyMap.get(svcId) || 0) + qty);
      }
    }

    const bookingSummary = await db.withTransaction(async (client) => {
      // 1. Kiểm tra khách sạn tồn tại và đã duyệt + lấy tỷ lệ chiết khấu hoa hồng của NCC
      const hotelRes = await client.query(
        `SELECT ks.id_khachsan, ks.ten_khachsan, ks.trang_thai_duyet, ncc.ty_le_chiet_khau
         FROM khach_san ks
         INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
         WHERE ks.id_khachsan = $1
         LIMIT 1`,
        [hotelId]
      );

      if (hotelRes.rowCount === 0) {
        const err = new Error('Không tìm thấy khách sạn.');
        err.statusCode = 404;
        throw err;
      }

      const hotel = hotelRes.rows[0];
      if (String(hotel.trang_thai_duyet).toUpperCase() !== 'DA_DUYET') {
        const err = new Error('Khách sạn này hiện chưa mở đặt phòng.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Khóa các dòng phòng bằng FOR UPDATE để chống đặt trùng đồng thời (race condition)
      const roomsRes = await client.query(
        `SELECT p.id_phong, p.so_phong, p.trang_thai_phong, lp.id_khachsan, lp.gia_moi_dem
         FROM phong p
         INNER JOIN loai_phong lp ON lp.id_loaiphong = p.id_loaiphong
         WHERE p.id_phong = ANY($1::bigint[])
         ORDER BY p.id_phong ASC
         FOR UPDATE OF p`,
        [uniqueRoomIds]
      );

      if (roomsRes.rowCount !== uniqueRoomIds.length) {
        const err = new Error('Một hoặc nhiều phòng bạn chọn không tồn tại.');
        err.statusCode = 404;
        throw err;
      }

      for (const room of roomsRes.rows) {
        if (Number(room.id_khachsan) !== hotelId) {
          const err = new Error(`Phòng ${room.so_phong} không thuộc khách sạn đã chọn.`);
          err.statusCode = 400;
          throw err;
        }
        const st = String(room.trang_thai_phong || '').toUpperCase();
        if (st === 'BAO_TRI' || st === 'TAM_NGUNG') {
          const err = new Error(`Phòng ${room.so_phong} hiện đang ở trạng thái ${st}, không thể đặt.`);
          err.statusCode = 409;
          throw err;
        }
      }

      // 3. Kiểm tra trùng lịch đặt với các đơn chưa hủy/chưa từ chối
      const conflictRes = await client.query(
        `SELECT DISTINCT p.so_phong
         FROM chi_tiet_dat_phong ctdp
         INNER JOIN don_dat_phong ddp ON ddp.id_dondat = ctdp.id_dondat
         INNER JOIN phong p ON p.id_phong = ctdp.id_phong
         WHERE ctdp.id_phong = ANY($1::bigint[])
           AND UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
           AND ddp.ngay_nhan_phong < $3::date
           AND ddp.ngay_tra_phong > $2::date`,
        [uniqueRoomIds, ngay_nhan_phong, ngay_tra_phong]
      );

      if (conflictRes.rowCount > 0) {
        const bookedRoomNumbers = conflictRes.rows.map((r) => r.so_phong).join(', ');
        const err = new Error(
          `Phòng (${bookedRoomNumbers}) đã có người đặt trong khoảng thời gian từ ${ngay_nhan_phong} đến ${ngay_tra_phong}.`
        );
        err.statusCode = 409;
        throw err;
      }

      // 4. Tính tiền phòng
      let roomSubtotal = 0;
      const roomItems = roomsRes.rows.map((room) => {
        const unitPrice = Number(room.gia_moi_dem);
        const lineTotal = unitPrice * nights;
        roomSubtotal += lineTotal;
        return {
          id_phong: Number(room.id_phong),
          don_gia: unitPrice,
          so_dem: nights,
          thanh_tien: lineTotal,
        };
      });

      // 5. Kiểm tra & tính tiền dịch vụ đi kèm (nếu có)
      let serviceSubtotal = 0;
      const serviceItems = [];
      if (serviceQtyMap.size > 0) {
        const svcIds = [...serviceQtyMap.keys()];
        const svcRes = await client.query(
          `SELECT id_dichvu, id_khachsan, ten_dichvu, gia_dichvu
           FROM dich_vu
           WHERE id_dichvu = ANY($1::bigint[])`,
          [svcIds]
        );

        if (svcRes.rowCount !== svcIds.length) {
          const err = new Error('Một hoặc nhiều dịch vụ không tồn tại.');
          err.statusCode = 404;
          throw err;
        }

        for (const svc of svcRes.rows) {
          if (Number(svc.id_khachsan) !== hotelId) {
            const err = new Error(`Dịch vụ "${svc.ten_dichvu}" không thuộc khách sạn đã chọn.`);
            err.statusCode = 400;
            throw err;
          }
          const qty = serviceQtyMap.get(Number(svc.id_dichvu));
          const unitPrice = Number(svc.gia_dichvu);
          serviceSubtotal += unitPrice * qty;
          serviceItems.push({
            id_dichvu: Number(svc.id_dichvu),
            so_luong: qty,
            don_gia: unitPrice,
          });
        }
      }

      const subtotal = roomSubtotal + serviceSubtotal;

      // 6. Áp dụng mã khuyến mãi (nếu có)
      let voucherId = null;
      let discountAmount = 0;
      if (ma_voucher && String(ma_voucher).trim()) {
        const code = String(ma_voucher).trim().toUpperCase();
        const voucherRes = await client.query(
          'SELECT * FROM khuyen_mai WHERE UPPER(ma_voucher) = $1 LIMIT 1',
          [code]
        );
        if (voucherRes.rowCount === 0) {
          const err = new Error(`Mã khuyến mãi "${code}" không tồn tại.`);
          err.statusCode = 404;
          throw err;
        }
        const voucher = voucherRes.rows[0];
        if (voucher.id_khachsan && Number(voucher.id_khachsan) !== hotelId) {
          const err = new Error(`Mã khuyến mãi "${code}" không áp dụng cho khách sạn này.`);
          err.statusCode = 400;
          throw err;
        }
        const now = new Date();
        if (now < new Date(voucher.ngay_batdau) || now > new Date(voucher.ngay_ketthuc)) {
          const err = new Error(`Mã khuyến mãi "${code}" không trong thời gian hiệu lực.`);
          err.statusCode = 400;
          throw err;
        }
        voucherId = Number(voucher.id_khuyenmai);
        discountAmount = calculateVoucherDiscount(voucher, subtotal).so_tien_giam;
      }

      const finalTotal = Math.max(0, subtotal - discountAmount);
      const commissionRate = Number(hotel.ty_le_chiet_khau) || 0;
      const commissionFee = Math.round((finalTotal * commissionRate) / 100);

      // 7. Ghi don_dat_phong
      const insertBookingRes = await client.query(
        `INSERT INTO don_dat_phong (
           id_nguoidung, id_khachsan, id_khuyenmai,
           ngay_nhan_phong, ngay_tra_phong, tong_tien, phi_hoa_hong, trang_thai_don
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'CHO_XAC_NHAN')
         RETURNING id_dondat`,
        [
          req.user.id_nguoidung,
          hotelId,
          voucherId,
          ngay_nhan_phong,
          ngay_tra_phong,
          finalTotal,
          commissionFee,
        ]
      );
      const bookingId = Number(insertBookingRes.rows[0].id_dondat);

      // 8. Ghi chi_tiet_dat_phong
      for (const item of roomItems) {
        await client.query(
          `INSERT INTO chi_tiet_dat_phong (id_dondat, id_phong, don_gia, so_dem, thanh_tien)
           VALUES ($1, $2, $3, $4, $5)`,
          [bookingId, item.id_phong, item.don_gia, item.so_dem, item.thanh_tien]
        );
      }

      // 9. Ghi chi_tiet_dich_vu
      for (const item of serviceItems) {
        await client.query(
          `INSERT INTO chi_tiet_dich_vu (id_dondat, id_dichvu, so_luong, don_gia)
           VALUES ($1, $2, $3, $4)`,
          [bookingId, item.id_dichvu, item.so_luong, item.don_gia]
        );
      }

      return {
        bookingId,
        hotelName: hotel.ten_khachsan,
        roomSubtotal,
        serviceSubtotal,
        discountAmount,
        finalTotal,
      };
    });

    const detail = await fetchBookingDetail(bookingSummary.bookingId);

    // Gửi email thông báo đặt phòng (không chặn response nếu lỗi SMTP)
    sendMail({
      to: req.user.email,
      subject: `[StayWithUs] Xác nhận tiếp nhận đơn đặt phòng #${bookingSummary.bookingId}`,
      text: `Xin chào ${req.user.ho_ten}, đơn đặt phòng #${bookingSummary.bookingId} tại ${bookingSummary.hotelName} (${ngay_nhan_phong} -> ${ngay_tra_phong}) với tổng tiền ${bookingSummary.finalTotal.toLocaleString('vi-VN')} VNĐ đã được tạo thành công.`,
      html: `<p>Xin chào <strong>${req.user.ho_ten}</strong>,</p>
             <p>Đơn đặt phòng <strong>#${bookingSummary.bookingId}</strong> tại <strong>${bookingSummary.hotelName}</strong> (${ngay_nhan_phong} → ${ngay_tra_phong}) đã được tiếp nhận.</p>
             <p>Tổng thanh toán: <strong>${bookingSummary.finalTotal.toLocaleString('vi-VN')} VNĐ</strong>.</p>`,
    }).catch((err) => console.warn('[Mailer] Không gửi được email xác nhận đơn:', err.message));

    const { vendor_user_id, ...safeDetail } = detail;
    return res.status(201).json({
      success: true,
      message: 'Đặt phòng thành công.',
      data: {
        ...safeDetail,
        tom_tat_gia: {
          tien_phong: bookingSummary.roomSubtotal,
          tien_dich_vu: bookingSummary.serviceSubtotal,
          giam_gia: bookingSummary.discountAmount,
          tong_thanh_toan: bookingSummary.finalTotal,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/my-bookings
 */
const listMyBookings = async (req, res, next) => {
  try {
    const { trang_thai_don, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['ddp.id_nguoidung = $1'];
    const params = [req.user.id_nguoidung];

    if (trang_thai_don) {
      params.push(String(trang_thai_don).trim().toUpperCase());
      conditions.push(`UPPER(ddp.trang_thai_don) = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM don_dat_phong ddp ${whereClause}`,
      params
    );

    const dataParams = [...params, limitNum, offset];
    const result = await db.query(
      `SELECT
         ddp.*,
         ks.ten_khachsan,
         ks.dia_chi,
         ks.hang_sao,
         COUNT(DISTINCT ctdp.id_phong)::int AS so_phong,
         COALESCE(
           (SELECT tt.trang_thai_tt FROM thanh_toan tt WHERE tt.id_dondat = ddp.id_dondat ORDER BY tt.id_thanhtoan DESC LIMIT 1),
           'CHUA_THANH_TOAN'
         ) AS trang_thai_thanh_toan,
         EXISTS (
           SELECT 1 FROM danh_gia dg
           WHERE dg.id_nguoidung = ddp.id_nguoidung AND dg.id_khachsan = ddp.id_khachsan
         ) AS da_danh_gia,
         (
           UPPER(ddp.trang_thai_don) = 'HOAN_THANH'
           OR (UPPER(ddp.trang_thai_don) IN ('DA_XAC_NHAN', 'DA_CHECKIN') AND ddp.ngay_tra_phong <= CURRENT_DATE)
         ) AS co_the_danh_gia
       FROM don_dat_phong ddp
       INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
       LEFT JOIN chi_tiet_dat_phong ctdp ON ctdp.id_dondat = ddp.id_dondat
       ${whereClause}
       GROUP BY ddp.id_dondat, ks.id_khachsan
       ORDER BY ddp.id_dondat DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        id_dondat: Number(r.id_dondat),
        id_nguoidung: Number(r.id_nguoidung),
        id_khachsan: Number(r.id_khachsan),
        id_khuyenmai: r.id_khuyenmai ? Number(r.id_khuyenmai) : null,
        tong_tien: Number(r.tong_tien),
        phi_hoa_hong: Number(r.phi_hoa_hong),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countRes.rows[0].total,
        total_pages: Math.ceil(countRes.rows[0].total / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/vendor/list (Vendor xem đơn của các khách sạn thuộc mình)
 */
const listVendorBookings = async (req, res, next) => {
  try {
    if (!req.user.ho_so_ncc && req.user.vai_tro !== ROLES.ADMIN) {
      return res.status(404).json({ success: false, message: 'Chưa có hồ sơ nhà cung cấp.' });
    }

    const { id_khachsan, trang_thai_don } = req.query;
    const conditions = [];
    const params = [];

    if (req.user.vai_tro !== ROLES.ADMIN) {
      params.push(req.user.ho_so_ncc.id_ncc);
      conditions.push(`ks.id_ncc = $${params.length}`);
    }

    if (id_khachsan) {
      params.push(Number(id_khachsan));
      conditions.push(`ddp.id_khachsan = $${params.length}`);
    }

    if (trang_thai_don) {
      params.push(String(trang_thai_don).trim().toUpperCase());
      conditions.push(`UPPER(ddp.trang_thai_don) = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT
         ddp.*,
         ks.ten_khachsan,
         nd.ho_ten AS khach_ho_ten,
         nd.email AS khach_email,
         nd.sdt AS khach_sdt,
         COUNT(DISTINCT ctdp.id_phong)::int AS so_phong,
         COALESCE(
           (SELECT tt.trang_thai_tt FROM thanh_toan tt WHERE tt.id_dondat = ddp.id_dondat ORDER BY tt.id_thanhtoan DESC LIMIT 1),
           'CHUA_THANH_TOAN'
         ) AS trang_thai_thanh_toan,
         EXISTS (
           SELECT 1 FROM danh_gia dg
           WHERE dg.id_nguoidung = ddp.id_nguoidung AND dg.id_khachsan = ddp.id_khachsan
         ) AS da_danh_gia,
         (
           UPPER(ddp.trang_thai_don) = 'HOAN_THANH'
           OR (UPPER(ddp.trang_thai_don) IN ('DA_XAC_NHAN', 'DA_CHECKIN') AND ddp.ngay_tra_phong <= CURRENT_DATE)
         ) AS co_the_danh_gia
       FROM don_dat_phong ddp
       INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
       INNER JOIN nguoi_dung nd ON nd.id_nguoidung = ddp.id_nguoidung
       LEFT JOIN chi_tiet_dat_phong ctdp ON ctdp.id_dondat = ddp.id_dondat
       ${whereClause}
       GROUP BY ddp.id_dondat, ks.id_khachsan, nd.id_nguoidung
       ORDER BY ddp.id_dondat DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        id_dondat: Number(r.id_dondat),
        id_nguoidung: Number(r.id_nguoidung),
        id_khachsan: Number(r.id_khachsan),
        tong_tien: Number(r.tong_tien),
        phi_hoa_hong: Number(r.phi_hoa_hong),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/admin/all (Admin xem toàn bộ đơn đặt phòng & thống kê hoa hồng)
 */
const listAdminBookings = async (req, res, next) => {
  try {
    const { trang_thai_don, id_khachsan } = req.query;
    const conditions = [];
    const params = [];

    if (trang_thai_don) {
      params.push(String(trang_thai_don).trim().toUpperCase());
      conditions.push(`UPPER(ddp.trang_thai_don) = $${params.length}`);
    }
    if (id_khachsan) {
      params.push(Number(id_khachsan));
      conditions.push(`ddp.id_khachsan = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [listRes, summaryRes] = await Promise.all([
      db.query(
        `SELECT
           ddp.*,
           ks.ten_khachsan,
           ncc.ten_doanh_nghiep,
           nd.ho_ten AS khach_ho_ten,
           nd.email AS khach_email
         FROM don_dat_phong ddp
         INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
         INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
         INNER JOIN nguoi_dung nd ON nd.id_nguoidung = ddp.id_nguoidung
         ${whereClause}
         ORDER BY ddp.id_dondat DESC`,
        params
      ),
      db.query(
        `SELECT
           COUNT(*)::int AS tong_so_don,
           COALESCE(SUM(tong_tien) FILTER (WHERE trang_thai_don NOT IN ('DA_HUY', 'TU_CHOI')), 0)::numeric AS tong_doanh_thu,
           COALESCE(SUM(phi_hoa_hong) FILTER (WHERE trang_thai_don NOT IN ('DA_HUY', 'TU_CHOI')), 0)::numeric AS tong_hoa_hong
         FROM don_dat_phong ddp
         ${whereClause}`,
        params
      ),
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        tong_so_don: summaryRes.rows[0].tong_so_don,
        tong_doanh_thu: Number(summaryRes.rows[0].tong_doanh_thu),
        tong_hoa_hong: Number(summaryRes.rows[0].tong_hoa_hong),
      },
      data: listRes.rows.map((r) => ({
        ...r,
        id_dondat: Number(r.id_dondat),
        id_nguoidung: Number(r.id_nguoidung),
        id_khachsan: Number(r.id_khachsan),
        tong_tien: Number(r.tong_tien),
        phi_hoa_hong: Number(r.phi_hoa_hong),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.id);
    const detail = await fetchBookingDetail(bookingId);

    if (!detail) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt phòng.' });
    }

    const isAllowed =
      req.user.vai_tro === ROLES.ADMIN ||
      Number(req.user.id_nguoidung) === detail.id_nguoidung ||
      Number(req.user.id_nguoidung) === detail.vendor_user_id;

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn đặt phòng này.',
      });
    }

    const { vendor_user_id, ...safeDetail } = detail;
    return res.status(200).json({
      success: true,
      data: safeDetail,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/bookings/:id/cancel (Khách hàng hủy đơn của mình hoặc Admin hủy)
 */
const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.id);

    const updated = await db.withTransaction(async (client) => {
      const resCheck = await client.query(
        'SELECT id_dondat, id_nguoidung, trang_thai_don FROM don_dat_phong WHERE id_dondat = $1 FOR UPDATE',
        [bookingId]
      );

      if (resCheck.rowCount === 0) {
        const err = new Error('Không tìm thấy đơn đặt phòng.');
        err.statusCode = 404;
        throw err;
      }

      const booking = resCheck.rows[0];
      if (
        req.user.vai_tro !== ROLES.ADMIN &&
        Number(booking.id_nguoidung) !== Number(req.user.id_nguoidung)
      ) {
        const err = new Error('Bạn không có quyền hủy đơn đặt phòng này.');
        err.statusCode = 403;
        throw err;
      }

      const currentStatus = String(booking.trang_thai_don).toUpperCase();
      if (!['CHO_XAC_NHAN', 'DA_XAC_NHAN'].includes(currentStatus)) {
        const err = new Error(`Không thể hủy đơn đang ở trạng thái "${currentStatus}".`);
        err.statusCode = 400;
        throw err;
      }

      const resUpdate = await client.query(
        `UPDATE don_dat_phong
         SET trang_thai_don = 'DA_HUY'
         WHERE id_dondat = $1
         RETURNING *`,
        [bookingId]
      );

      return resUpdate.rows[0];
    });

    return res.status(200).json({
      success: true,
      message: 'Hủy đơn đặt phòng thành công.',
      data: {
        ...updated,
        id_dondat: Number(updated.id_dondat),
        tong_tien: Number(updated.tong_tien),
        phi_hoa_hong: Number(updated.phi_hoa_hong),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/bookings/:id/status (Vendor chủ khách sạn hoặc Admin cập nhật vòng đời đơn)
 */
const updateBookingStatus = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.id);
    const nextStatus = String(req.body.trang_thai_don || '').trim().toUpperCase();

    if (!BOOKING_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `trang_thai_don không hợp lệ. Chỉ chấp nhận: ${BOOKING_STATUSES.join(', ')}.`,
      });
    }

    const updated = await db.withTransaction(async (client) => {
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
      if (
        req.user.vai_tro !== ROLES.ADMIN &&
        Number(booking.vendor_user_id) !== Number(req.user.id_nguoidung)
      ) {
        const err = new Error('Bạn không có quyền cập nhật đơn đặt phòng của khách sạn khác.');
        err.statusCode = 403;
        throw err;
      }

      const currentStatus = String(booking.trang_thai_don).toUpperCase();
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
      if (currentStatus !== nextStatus && !allowedNext.includes(nextStatus)) {
        const err = new Error(
          `Không thể chuyển đơn từ "${currentStatus}" sang "${nextStatus}". Cho phép: ${allowedNext.join(', ') || 'không có'}.`
        );
        err.statusCode = 400;
        throw err;
      }

      const updateRes = await client.query(
        `UPDATE don_dat_phong
         SET trang_thai_don = $1
         WHERE id_dondat = $2
         RETURNING *`,
        [nextStatus, bookingId]
      );

      // Đồng bộ trạng thái phòng vật lý khi nhận phòng / trả phòng
      if (nextStatus === 'DA_CHECKIN') {
        await client.query(
          `UPDATE phong
           SET trang_thai_phong = 'DANG_SU_DUNG'
           WHERE id_phong IN (SELECT id_phong FROM chi_tiet_dat_phong WHERE id_dondat = $1)`,
          [bookingId]
        );
      } else if (nextStatus === 'HOAN_THANH' || nextStatus === 'DA_HUY') {
        await client.query(
          `UPDATE phong
           SET trang_thai_phong = 'TRONG'
           WHERE id_phong IN (SELECT id_phong FROM chi_tiet_dat_phong WHERE id_dondat = $1)
             AND UPPER(trang_thai_phong) = 'DANG_SU_DUNG'`,
          [bookingId]
        );
      }

      return updateRes.rows[0];
    });

    return res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái đơn đặt phòng thành "${nextStatus}".`,
      data: {
        ...updated,
        id_dondat: Number(updated.id_dondat),
        tong_tien: Number(updated.tong_tien),
        phi_hoa_hong: Number(updated.phi_hoa_hong),
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createBooking,
  listMyBookings,
  listVendorBookings,
  listAdminBookings,
  getBookingById,
  cancelBooking,
  updateBookingStatus,
};
