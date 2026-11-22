const db = require('../config/db');
const { ROLES, normalizeRole } = require('../middlewares/auth.middleware');

const ALLOWED_VENDOR_STATUSES = ['CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'TAM_NGUNG'];

const formatVendor = (row) => ({
  id_ncc: Number(row.id_ncc),
  id_nguoidung: Number(row.id_nguoidung),
  ten_doanh_nghiep: row.ten_doanh_nghiep,
  ma_so_thue: row.ma_so_thue,
  so_tai_khoan: row.so_tai_khoan,
  ty_le_chiet_khau: Number(row.ty_le_chiet_khau),
  trang_thai_duyet: row.trang_thai_duyet,
  ...(row.ho_ten !== undefined && {
    nguoi_dung: {
      ho_ten: row.ho_ten,
      email: row.email,
      sdt: row.sdt,
      trang_thai_tk: row.trang_thai_tk,
    },
  }),
  ...(row.so_khach_san !== undefined && { so_khach_san: Number(row.so_khach_san) }),
});

/**
 * POST /api/vendors/register
 * Người dùng đang đăng nhập (USER) đăng ký mở hồ sơ Nhà cung cấp (ho_so_ncc).
 */
const registerVendorProfile = async (req, res, next) => {
  try {
    const { ten_doanh_nghiep, ma_so_thue, so_tai_khoan } = req.body;

    if (
      !String(ten_doanh_nghiep || '').trim() ||
      !String(ma_so_thue || '').trim() ||
      !String(so_tai_khoan || '').trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: ten_doanh_nghiep, ma_so_thue, so_tai_khoan.',
      });
    }

    const existing = await db.query(
      'SELECT id_ncc, trang_thai_duyet FROM ho_so_ncc WHERE id_nguoidung = $1 LIMIT 1',
      [req.user.id_nguoidung]
    );

    if (existing.rowCount > 0) {
      const currentStatus = String(existing.rows[0].trang_thai_duyet || '').toUpperCase();
      if (currentStatus !== 'TU_CHOI') {
        return res.status(409).json({
          success: false,
          message: `Bạn đã có hồ sơ nhà cung cấp với trạng thái "${currentStatus}".`,
        });
      }

      // Cho phép nộp lại nếu trước đó bị từ chối
      const resubmitted = await db.query(
        `UPDATE ho_so_ncc
         SET ten_doanh_nghiep = $1,
             ma_so_thue = $2,
             so_tai_khoan = $3,
             trang_thai_duyet = 'CHO_DUYET'
         WHERE id_nguoidung = $4
         RETURNING id_ncc, id_nguoidung, ten_doanh_nghiep, ma_so_thue, so_tai_khoan, ty_le_chiet_khau, trang_thai_duyet`,
        [
          String(ten_doanh_nghiep).trim(),
          String(ma_so_thue).trim(),
          String(so_tai_khoan).trim(),
          req.user.id_nguoidung,
        ]
      );

      return res.status(200).json({
        success: true,
        message: 'Đã gửi lại hồ sơ nhà cung cấp để quản trị viên phê duyệt.',
        data: formatVendor(resubmitted.rows[0]),
      });
    }

    const inserted = await db.query(
      `INSERT INTO ho_so_ncc (id_nguoidung, ten_doanh_nghiep, ma_so_thue, so_tai_khoan, trang_thai_duyet)
       VALUES ($1, $2, $3, $4, 'CHO_DUYET')
       RETURNING id_ncc, id_nguoidung, ten_doanh_nghiep, ma_so_thue, so_tai_khoan, ty_le_chiet_khau, trang_thai_duyet`,
      [
        req.user.id_nguoidung,
        String(ten_doanh_nghiep).trim(),
        String(ma_so_thue).trim(),
        String(so_tai_khoan).trim(),
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký hồ sơ nhà cung cấp thành công. Vui lòng chờ quản trị viên phê duyệt.',
      data: formatVendor(inserted.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/vendors/me
 * Xem hồ sơ nhà cung cấp của tài khoản đang đăng nhập.
 */
const getMyVendorProfile = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         ncc.*,
         COUNT(ks.id_khachsan)::int AS so_khach_san
       FROM ho_so_ncc ncc
       LEFT JOIN khach_san ks ON ks.id_ncc = ncc.id_ncc
       WHERE ncc.id_nguoidung = $1
       GROUP BY ncc.id_ncc
       LIMIT 1`,
      [req.user.id_nguoidung]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bạn chưa có hồ sơ nhà cung cấp.',
      });
    }

    return res.status(200).json({
      success: true,
      data: formatVendor(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/vendors/me
 * Nhà cung cấp tự cập nhật tên doanh nghiệp, mã số thuế, số tài khoản.
 */
const updateMyVendorProfile = async (req, res, next) => {
  try {
    const { ten_doanh_nghiep, ma_so_thue, so_tai_khoan } = req.body;

    const existing = await db.query(
      'SELECT * FROM ho_so_ncc WHERE id_nguoidung = $1 LIMIT 1',
      [req.user.id_nguoidung]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ nhà cung cấp.',
      });
    }

    const current = existing.rows[0];
    const updated = await db.query(
      `UPDATE ho_so_ncc
       SET ten_doanh_nghiep = $1,
           ma_so_thue = $2,
           so_tai_khoan = $3
       WHERE id_ncc = $4
       RETURNING *`,
      [
        ten_doanh_nghiep !== undefined ? String(ten_doanh_nghiep).trim() : current.ten_doanh_nghiep,
        ma_so_thue !== undefined ? String(ma_so_thue).trim() : current.ma_so_thue,
        so_tai_khoan !== undefined ? String(so_tai_khoan).trim() : current.so_tai_khoan,
        current.id_ncc,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ nhà cung cấp thành công.',
      data: formatVendor(updated.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/vendors (Admin)
 * Liệt kê danh sách hồ sơ nhà cung cấp theo trạng thái duyệt và từ khóa.
 */
const listVendorsAdmin = async (req, res, next) => {
  try {
    const { trang_thai_duyet, keyword } = req.query;
    const conditions = [];
    const params = [];

    if (trang_thai_duyet) {
      params.push(String(trang_thai_duyet).trim().toUpperCase());
      conditions.push(`UPPER(ncc.trang_thai_duyet) = $${params.length}`);
    }

    if (keyword) {
      params.push(`%${String(keyword).trim()}%`);
      conditions.push(
        `(ncc.ten_doanh_nghiep ILIKE $${params.length} OR ncc.ma_so_thue ILIKE $${params.length} OR nd.ho_ten ILIKE $${params.length} OR nd.email ILIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT
         ncc.*,
         nd.ho_ten,
         nd.email,
         nd.sdt,
         nd.trang_thai_tk,
         COUNT(ks.id_khachsan)::int AS so_khach_san
       FROM ho_so_ncc ncc
       INNER JOIN nguoi_dung nd ON nd.id_nguoidung = ncc.id_nguoidung
       LEFT JOIN khach_san ks ON ks.id_ncc = ncc.id_ncc
       ${whereClause}
       GROUP BY ncc.id_ncc, nd.id_nguoidung
       ORDER BY ncc.id_ncc DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map(formatVendor),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/vendors/:id/approval (Admin)
 * Duyệt/từ chối hồ sơ nhà cung cấp và tùy chọn cập nhật tỷ lệ chiết khấu hoa hồng (0 - 100%).
 * Khi duyệt DA_DUYET, tự động nâng vai trò người dùng sang VENDOR (nếu đang là USER).
 */
const approveVendorAdmin = async (req, res, next) => {
  try {
    const vendorId = Number(req.params.id);
    const { trang_thai_duyet, ty_le_chiet_khau } = req.body;

    const nextStatus = trang_thai_duyet ? String(trang_thai_duyet).trim().toUpperCase() : null;
    if (nextStatus && !ALLOWED_VENDOR_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `trang_thai_duyet không hợp lệ. Chỉ chấp nhận: ${ALLOWED_VENDOR_STATUSES.join(', ')}.`,
      });
    }

    if (ty_le_chiet_khau !== undefined) {
      const rate = Number(ty_le_chiet_khau);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({
          success: false,
          message: 'ty_le_chiet_khau phải nằm trong khoảng từ 0 đến 100 (%).',
        });
      }
    }

    const updated = await db.withTransaction(async (client) => {
      const vendorRes = await client.query(
        'SELECT * FROM ho_so_ncc WHERE id_ncc = $1 LIMIT 1',
        [vendorId]
      );
      if (vendorRes.rowCount === 0) {
        const err = new Error('Không tìm thấy hồ sơ nhà cung cấp.');
        err.statusCode = 404;
        throw err;
      }

      const current = vendorRes.rows[0];
      const finalStatus = nextStatus || current.trang_thai_duyet;
      const finalRate =
        ty_le_chiet_khau !== undefined ? Number(ty_le_chiet_khau) : Number(current.ty_le_chiet_khau);

      const updateRes = await client.query(
        `UPDATE ho_so_ncc
         SET trang_thai_duyet = $1,
             ty_le_chiet_khau = $2
         WHERE id_ncc = $3
         RETURNING *`,
        [finalStatus, finalRate, vendorId]
      );

      // Nếu duyệt thành công -> đảm bảo người dùng có vai trò VENDOR (không hạ quyền nếu là ADMIN)
      if (finalStatus === 'DA_DUYET') {
        const userRoleRes = await client.query(
          `SELECT nd.id_nguoidung, vt.ten_vaitro
           FROM nguoi_dung nd
           INNER JOIN vai_tro vt ON vt.id_vaitro = nd.id_vaitro
           WHERE nd.id_nguoidung = $1`,
          [current.id_nguoidung]
        );
        const currentRole = normalizeRole(userRoleRes.rows[0]?.ten_vaitro);

        if (currentRole === ROLES.USER) {
          const rolesRes = await client.query('SELECT id_vaitro, ten_vaitro FROM vai_tro');
          const vendorRole = rolesRes.rows.find((r) => normalizeRole(r.ten_vaitro) === ROLES.VENDOR);
          if (vendorRole) {
            await client.query(
              'UPDATE nguoi_dung SET id_vaitro = $1 WHERE id_nguoidung = $2',
              [vendorRole.id_vaitro, current.id_nguoidung]
            );
          }
        }
      }

      return updateRes.rows[0];
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái phê duyệt nhà cung cấp thành công.',
      data: formatVendor(updated),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerVendorProfile,
  getMyVendorProfile,
  updateMyVendorProfile,
  listVendorsAdmin,
  approveVendorAdmin,
};
