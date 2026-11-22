const db = require('../config/db');
const { ROLES } = require('../middlewares/auth.middleware');

const fillTwelveMonths = (rows) => {
  const byMonth = new Map(rows.map((r) => [Number(r.thang), r]));
  const result = [];
  for (let m = 1; m <= 12; m += 1) {
    const row = byMonth.get(m);
    result.push({
      thang: m,
      so_don: row ? Number(row.so_don) : 0,
      doanh_thu: row ? Number(row.doanh_thu) : 0,
      phi_hoa_hong: row ? Number(row.phi_hoa_hong) : 0,
      thuc_nhan_ncc: row ? Number(row.doanh_thu) - Number(row.phi_hoa_hong) : 0,
    });
  }
  return result;
};

// ============================================
// BÁO CÁO QUẢN TRỊ VIÊN (ADMIN DASHBOARD)
// ============================================

/**
 * GET /api/reports/admin/overview
 */
const getAdminOverview = async (_req, res, next) => {
  try {
    const [usersRes, vendorsRes, hotelsRes, bookingsRes, paymentsRes] = await Promise.all([
      db.query(
        `SELECT vt.ten_vaitro, COUNT(nd.id_nguoidung)::int AS so_luong
         FROM vai_tro vt
         LEFT JOIN nguoi_dung nd ON nd.id_vaitro = vt.id_vaitro
         GROUP BY vt.ten_vaitro`
      ),
      db.query(
        `SELECT
           COUNT(*)::int AS tong_ncc,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_duyet) = 'DA_DUYET')::int AS da_duyet,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_duyet) = 'CHO_DUYET')::int AS cho_duyet
         FROM ho_so_ncc`
      ),
      db.query(
        `SELECT
           COUNT(*)::int AS tong_khach_san,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_duyet) = 'DA_DUYET')::int AS da_duyet,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_duyet) = 'CHO_DUYET')::int AS cho_duyet
         FROM khach_san`
      ),
      db.query(
        `SELECT
           COUNT(*)::int AS tong_don,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_don) = 'CHO_XAC_NHAN')::int AS cho_xac_nhan,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_don) = 'DA_XAC_NHAN')::int AS da_xac_nhan,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_don) = 'DA_CHECKIN')::int AS da_checkin,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_don) = 'HOAN_THANH')::int AS hoan_thanh,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_don) IN ('DA_HUY', 'TU_CHOI'))::int AS da_huy_tu_choi,
           COALESCE(SUM(tong_tien) FILTER (WHERE UPPER(trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')), 0)::numeric AS tong_doanh_thu,
           COALESCE(SUM(phi_hoa_hong) FILTER (WHERE UPPER(trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')), 0)::numeric AS tong_hoa_hong
         FROM don_dat_phong`
      ),
      db.query(
        `SELECT
           COALESCE(SUM(so_tien) FILTER (WHERE UPPER(trang_thai_tt) = 'DA_THANH_TOAN'), 0)::numeric AS tong_da_thanh_toan,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_tt) = 'DA_THANH_TOAN')::int AS so_giao_dich_thanh_cong
         FROM thanh_toan`
      ),
    ]);

    const bookingStats = bookingsRes.rows[0];
    const paymentStats = paymentsRes.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        nguoi_dung_theo_vai_tro: usersRes.rows,
        nha_cung_cap: vendorsRes.rows[0],
        khach_san: hotelsRes.rows[0],
        don_dat_phong: {
          ...bookingStats,
          tong_doanh_thu: Number(bookingStats.tong_doanh_thu),
          tong_hoa_hong: Number(bookingStats.tong_hoa_hong),
        },
        thanh_toan: {
          so_giao_dich_thanh_cong: paymentStats.so_giao_dich_thanh_cong,
          tong_da_thanh_toan: Number(paymentStats.tong_da_thanh_toan),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/reports/admin/revenue?year=2026
 * Biểu đồ doanh thu & hoa hồng 12 tháng + Top 5 khách sạn + Top 5 địa điểm.
 */
const getAdminRevenue = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const [monthlyRes, topHotelsRes, topLocationsRes] = await Promise.all([
      db.query(
        `SELECT
           EXTRACT(MONTH FROM ngay_nhan_phong)::int AS thang,
           COUNT(*)::int AS so_don,
           COALESCE(SUM(tong_tien), 0)::numeric AS doanh_thu,
           COALESCE(SUM(phi_hoa_hong), 0)::numeric AS phi_hoa_hong
         FROM don_dat_phong
         WHERE EXTRACT(YEAR FROM ngay_nhan_phong) = $1
           AND UPPER(trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
         GROUP BY thang
         ORDER BY thang ASC`,
        [year]
      ),
      db.query(
        `SELECT
           ks.id_khachsan,
           ks.ten_khachsan,
           dd.tinh_thanh,
           COUNT(ddp.id_dondat)::int AS so_don,
           COALESCE(SUM(ddp.tong_tien), 0)::numeric AS doanh_thu,
           COALESCE(SUM(ddp.phi_hoa_hong), 0)::numeric AS phi_hoa_hong
         FROM don_dat_phong ddp
         INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
         INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
         WHERE EXTRACT(YEAR FROM ddp.ngay_nhan_phong) = $1
           AND UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
         GROUP BY ks.id_khachsan, dd.id_diadiem
         ORDER BY doanh_thu DESC
         LIMIT 5`,
        [year]
      ),
      db.query(
        `SELECT
           dd.id_diadiem,
           dd.tinh_thanh,
           dd.quan_huyen,
           COUNT(ddp.id_dondat)::int AS so_don,
           COALESCE(SUM(ddp.tong_tien), 0)::numeric AS doanh_thu
         FROM don_dat_phong ddp
         INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
         INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
         WHERE EXTRACT(YEAR FROM ddp.ngay_nhan_phong) = $1
           AND UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
         GROUP BY dd.id_diadiem
         ORDER BY doanh_thu DESC
         LIMIT 5`,
        [year]
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        nam: year,
        theo_thang: fillTwelveMonths(monthlyRes.rows),
        top_khach_san: topHotelsRes.rows.map((r) => ({
          ...r,
          id_khachsan: Number(r.id_khachsan),
          doanh_thu: Number(r.doanh_thu),
          phi_hoa_hong: Number(r.phi_hoa_hong),
        })),
        top_dia_diem: topLocationsRes.rows.map((r) => ({
          ...r,
          id_diadiem: Number(r.id_diadiem),
          doanh_thu: Number(r.doanh_thu),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================
// BÁO CÁO NHÀ CUNG CẤP (VENDOR DASHBOARD)
// ============================================

/**
 * GET /api/reports/vendor/overview
 */
const getVendorOverview = async (req, res, next) => {
  try {
    const vendorId =
      req.user.vai_tro === ROLES.ADMIN && req.query.id_ncc
        ? Number(req.query.id_ncc)
        : req.user.ho_so_ncc?.id_ncc;

    if (!vendorId) {
      return res.status(404).json({ success: false, message: 'Chưa có hồ sơ nhà cung cấp.' });
    }

    const [hotelsRes, roomsRes, bookingsRes, reviewsRes] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*)::int AS tong_khach_san,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_duyet) = 'DA_DUYET')::int AS da_duyet,
           COUNT(*) FILTER (WHERE UPPER(trang_thai_duyet) = 'CHO_DUYET')::int AS cho_duyet
         FROM khach_san
         WHERE id_ncc = $1`,
        [vendorId]
      ),
      db.query(
        `SELECT
           COUNT(p.id_phong)::int AS tong_so_phong,
           COUNT(p.id_phong) FILTER (WHERE UPPER(p.trang_thai_phong) = 'TRONG')::int AS phong_trong,
           COUNT(p.id_phong) FILTER (WHERE UPPER(p.trang_thai_phong) = 'DANG_SU_DUNG')::int AS dang_su_dung,
           COUNT(p.id_phong) FILTER (WHERE UPPER(p.trang_thai_phong) IN ('BAO_TRI', 'TAM_NGUNG'))::int AS bao_tri
         FROM phong p
         INNER JOIN loai_phong lp ON lp.id_loaiphong = p.id_loaiphong
         INNER JOIN khach_san ks ON ks.id_khachsan = lp.id_khachsan
         WHERE ks.id_ncc = $1`,
        [vendorId]
      ),
      db.query(
        `SELECT
           COUNT(ddp.id_dondat)::int AS tong_don,
           COUNT(ddp.id_dondat) FILTER (WHERE UPPER(ddp.trang_thai_don) = 'CHO_XAC_NHAN')::int AS cho_xac_nhan,
           COUNT(ddp.id_dondat) FILTER (WHERE UPPER(ddp.trang_thai_don) = 'DA_XAC_NHAN')::int AS da_xac_nhan,
           COUNT(ddp.id_dondat) FILTER (WHERE UPPER(ddp.trang_thai_don) = 'DA_CHECKIN')::int AS da_checkin,
           COUNT(ddp.id_dondat) FILTER (WHERE UPPER(ddp.trang_thai_don) = 'HOAN_THANH')::int AS hoan_thanh,
           COALESCE(SUM(ddp.tong_tien) FILTER (WHERE UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')), 0)::numeric AS tong_doanh_thu,
           COALESCE(SUM(ddp.phi_hoa_hong) FILTER (WHERE UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')), 0)::numeric AS tong_hoa_hong
         FROM don_dat_phong ddp
         INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
         WHERE ks.id_ncc = $1`,
        [vendorId]
      ),
      db.query(
        `SELECT
           COALESCE(ROUND(AVG(dg.so_sao)::numeric, 2), 0) AS diem_trung_binh,
           COUNT(dg.id_danhgia)::int AS tong_danh_gia
         FROM danh_gia dg
         INNER JOIN khach_san ks ON ks.id_khachsan = dg.id_khachsan
         WHERE ks.id_ncc = $1 AND UPPER(dg.trang_thai_duyet) = 'HIEN_THI'`,
        [vendorId]
      ),
    ]);

    const b = bookingsRes.rows[0];
    const totalRevenue = Number(b.tong_doanh_thu);
    const totalCommission = Number(b.tong_hoa_hong);

    return res.status(200).json({
      success: true,
      data: {
        id_ncc: vendorId,
        khach_san: hotelsRes.rows[0],
        phong: roomsRes.rows[0],
        don_dat_phong: {
          ...b,
          tong_doanh_thu: totalRevenue,
          tong_hoa_hong: totalCommission,
          doanh_thu_thuc_nhan: totalRevenue - totalCommission,
        },
        danh_gia: {
          diem_trung_binh: Number(reviewsRes.rows[0].diem_trung_binh),
          tong_danh_gia: reviewsRes.rows[0].tong_danh_gia,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/reports/vendor/revenue?year=2026&id_khachsan=...
 */
const getVendorRevenue = async (req, res, next) => {
  try {
    const vendorId =
      req.user.vai_tro === ROLES.ADMIN && req.query.id_ncc
        ? Number(req.query.id_ncc)
        : req.user.ho_so_ncc?.id_ncc;

    if (!vendorId) {
      return res.status(404).json({ success: false, message: 'Chưa có hồ sơ nhà cung cấp.' });
    }

    const year = Number(req.query.year) || new Date().getFullYear();
    const hotelIdFilter = req.query.id_khachsan ? Number(req.query.id_khachsan) : null;

    const params = [vendorId, year];
    let hotelClause = '';
    if (hotelIdFilter) {
      params.push(hotelIdFilter);
      hotelClause = `AND ddp.id_khachsan = $${params.length}`;
    }

    const [monthlyRes, byHotelRes] = await Promise.all([
      db.query(
        `SELECT
           EXTRACT(MONTH FROM ddp.ngay_nhan_phong)::int AS thang,
           COUNT(ddp.id_dondat)::int AS so_don,
           COALESCE(SUM(ddp.tong_tien), 0)::numeric AS doanh_thu,
           COALESCE(SUM(ddp.phi_hoa_hong), 0)::numeric AS phi_hoa_hong
         FROM don_dat_phong ddp
         INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
         WHERE ks.id_ncc = $1
           AND EXTRACT(YEAR FROM ddp.ngay_nhan_phong) = $2
           AND UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
           ${hotelClause}
         GROUP BY thang
         ORDER BY thang ASC`,
        params
      ),
      db.query(
        `SELECT
           ks.id_khachsan,
           ks.ten_khachsan,
           COUNT(ddp.id_dondat)::int AS so_don,
           COALESCE(SUM(ddp.tong_tien), 0)::numeric AS doanh_thu,
           COALESCE(SUM(ddp.phi_hoa_hong), 0)::numeric AS phi_hoa_hong
         FROM khach_san ks
         LEFT JOIN don_dat_phong ddp
           ON ddp.id_khachsan = ks.id_khachsan
           AND EXTRACT(YEAR FROM ddp.ngay_nhan_phong) = $2
           AND UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
         WHERE ks.id_ncc = $1
         GROUP BY ks.id_khachsan
         ORDER BY doanh_thu DESC`,
        [vendorId, year]
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        nam: year,
        theo_thang: fillTwelveMonths(monthlyRes.rows),
        theo_khach_san: byHotelRes.rows.map((r) => ({
          id_khachsan: Number(r.id_khachsan),
          ten_khachsan: r.ten_khachsan,
          so_don: r.so_don,
          doanh_thu: Number(r.doanh_thu),
          phi_hoa_hong: Number(r.phi_hoa_hong),
          thuc_nhan: Number(r.doanh_thu) - Number(r.phi_hoa_hong),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/reports/admin/customers (Admin)
 * Danh sách khách hàng trên sàn kèm tổng số đơn, tổng chi tiêu & trạng thái tài khoản.
 */
const listCustomersAdmin = async (req, res, next) => {
  try {
    const { keyword, trang_thai_tk } = req.query;
    const conditions = [`UPPER(vt.ten_vaitro) = 'USER'`];
    const params = [];

    if (keyword) {
      params.push(`%${String(keyword).trim()}%`);
      conditions.push(
        `(nd.ho_ten ILIKE $${params.length} OR nd.email ILIKE $${params.length} OR nd.sdt ILIKE $${params.length})`
      );
    }
    if (trang_thai_tk) {
      params.push(String(trang_thai_tk).trim().toUpperCase());
      conditions.push(`UPPER(nd.trang_thai_tk) = $${params.length}`);
    }

    const result = await db.query(
      `SELECT
         nd.id_nguoidung,
         nd.ho_ten,
         nd.email,
         nd.sdt,
         nd.trang_thai_tk,
         COUNT(DISTINCT ddp.id_dondat)::int AS tong_so_don,
         COALESCE(SUM(ddp.tong_tien) FILTER (WHERE UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')), 0)::numeric AS tong_chi_tieu,
         COUNT(DISTINCT dg.id_danhgia)::int AS so_danh_gia
       FROM nguoi_dung nd
       INNER JOIN vai_tro vt ON vt.id_vaitro = nd.id_vaitro
       LEFT JOIN don_dat_phong ddp ON ddp.id_nguoidung = nd.id_nguoidung
       LEFT JOIN danh_gia dg ON dg.id_nguoidung = nd.id_nguoidung
       WHERE ${conditions.join(' AND ')}
       GROUP BY nd.id_nguoidung
       ORDER BY nd.id_nguoidung DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        id_nguoidung: Number(r.id_nguoidung),
        tong_chi_tieu: Number(r.tong_chi_tieu),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/reports/admin/customers/:id/history (Admin)
 * Lịch sử đầy đủ của một khách hàng: đơn đặt phòng, thanh toán, hóa đơn VAT và đánh giá.
 */
const getCustomerHistoryAdmin = async (req, res, next) => {
  try {
    const customerId = Number(req.params.id);

    const userRes = await db.query(
      `SELECT nd.id_nguoidung, nd.ho_ten, nd.email, nd.sdt, nd.trang_thai_tk, vt.ten_vaitro
       FROM nguoi_dung nd
       INNER JOIN vai_tro vt ON vt.id_vaitro = nd.id_vaitro
       WHERE nd.id_nguoidung = $1
       LIMIT 1`,
      [customerId]
    );
    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng.' });
    }

    const [bookingsRes, paymentsRes, reviewsRes] = await Promise.all([
      db.query(
        `SELECT ddp.*, ks.ten_khachsan, km.ma_voucher
         FROM don_dat_phong ddp
         INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
         LEFT JOIN khuyen_mai km ON km.id_khuyenmai = ddp.id_khuyenmai
         WHERE ddp.id_nguoidung = $1
         ORDER BY ddp.id_dondat DESC`,
        [customerId]
      ),
      db.query(
        `SELECT tt.*, ks.ten_khachsan, hd.id_hoadon, hd.ten_cong_ty, hd.ma_so_thue
         FROM thanh_toan tt
         INNER JOIN don_dat_phong ddp ON ddp.id_dondat = tt.id_dondat
         INNER JOIN khach_san ks ON ks.id_khachsan = ddp.id_khachsan
         LEFT JOIN hoa_don hd ON hd.id_thanhtoan = tt.id_thanhtoan
         WHERE ddp.id_nguoidung = $1
         ORDER BY tt.id_thanhtoan DESC`,
        [customerId]
      ),
      db.query(
        `SELECT dg.*, ks.ten_khachsan
         FROM danh_gia dg
         INNER JOIN khach_san ks ON ks.id_khachsan = dg.id_khachsan
         WHERE dg.id_nguoidung = $1
         ORDER BY dg.id_danhgia DESC`,
        [customerId]
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        khach_hang: {
          ...userRes.rows[0],
          id_nguoidung: Number(userRes.rows[0].id_nguoidung),
        },
        lich_su_dat_phong: bookingsRes.rows.map((b) => ({
          ...b,
          id_dondat: Number(b.id_dondat),
          tong_tien: Number(b.tong_tien),
          phi_hoa_hong: Number(b.phi_hoa_hong),
        })),
        lich_su_thanh_toan: paymentsRes.rows.map((p) => ({
          ...p,
          id_thanhtoan: Number(p.id_thanhtoan),
          id_dondat: Number(p.id_dondat),
          so_tien: Number(p.so_tien),
        })),
        lich_su_danh_gia: reviewsRes.rows.map((rv) => ({
          ...rv,
          id_danhgia: Number(rv.id_danhgia),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/reports/admin/users/:id/status (Admin khóa / mở khóa tài khoản khách hàng)
 */
const updateUserStatusAdmin = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const nextStatus = String(req.body.trang_thai_tk || '').trim().toUpperCase();
    if (!['HOAT_DONG', 'BI_KHOA'].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'trang_thai_tk chỉ chấp nhận HOAT_DONG hoặc BI_KHOA.',
      });
    }

    if (userId === Number(req.user.id_nguoidung)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể tự khóa tài khoản quản trị đang đăng nhập.',
      });
    }

    const updated = await db.query(
      `UPDATE nguoi_dung SET trang_thai_tk = $1 WHERE id_nguoidung = $2 RETURNING id_nguoidung, ho_ten, email, trang_thai_tk`,
      [nextStatus, userId]
    );
    if (updated.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái tài khoản thành ${nextStatus}.`,
      data: updated.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAdminOverview,
  getAdminRevenue,
  getVendorOverview,
  getVendorRevenue,
  listCustomersAdmin,
  getCustomerHistoryAdmin,
  updateUserStatusAdmin,
};
