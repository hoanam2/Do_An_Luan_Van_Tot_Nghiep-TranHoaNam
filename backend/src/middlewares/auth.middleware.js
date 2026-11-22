const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Chuẩn hóa tên vai trò trong hệ thống.
 * Hỗ trợ ánh xạ linh hoạt nếu bảng vai_tro lưu tiếng Anh hoặc tiếng Việt.
 */
const ROLES = Object.freeze({
  USER: 'USER',
  VENDOR: 'VENDOR',
  ADMIN: 'ADMIN',
});

const ROLE_ALIAS_MAP = {
  USER: ROLES.USER,
  CUSTOMER: ROLES.USER,
  KHACH_HANG: ROLES.USER,
  'KHACH HANG': ROLES.USER,
  'KHÁCH HÀNG': ROLES.USER,

  VENDOR: ROLES.VENDOR,
  SUPPLIER: ROLES.VENDOR,
  NHA_CUNG_CAP: ROLES.VENDOR,
  'NHA CUNG CAP': ROLES.VENDOR,
  'NHÀ CUNG CẤP': ROLES.VENDOR,
  CHU_KHACH_SAN: ROLES.VENDOR,

  ADMIN: ROLES.ADMIN,
  QUAN_TRI: ROLES.ADMIN,
  QUAN_TRI_VIEN: ROLES.ADMIN,
  'QUẢN TRỊ VIÊN': ROLES.ADMIN,
};

const normalizeRole = (rawRole) => {
  if (!rawRole) return '';
  const key = String(rawRole).trim().toUpperCase();
  return ROLE_ALIAS_MAP[key] || key;
};

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
};

/**
 * Tải thông tin người dùng, vai trò và hồ sơ nhà cung cấp (nếu có) từ hotel_booking_db.
 */
const loadUserFromToken = async (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Thiếu biến môi trường JWT_SECRET.');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.id_nguoidung;

  const result = await db.query(
    `SELECT
       nd.id_nguoidung,
       nd.id_vaitro,
       nd.ho_ten,
       nd.email,
       nd.sdt,
       nd.avatar,
       nd.trang_thai_tk,
       vt.ten_vaitro,
       ncc.id_ncc,
       ncc.ten_doanh_nghiep,
       ncc.ma_so_thue,
       ncc.so_tai_khoan,
       ncc.ty_le_chiet_khau,
       ncc.trang_thai_duyet AS trang_thai_ncc
     FROM nguoi_dung nd
     INNER JOIN vai_tro vt ON nd.id_vaitro = vt.id_vaitro
     LEFT JOIN ho_so_ncc ncc ON ncc.id_nguoidung = nd.id_nguoidung
     WHERE nd.id_nguoidung = $1
     LIMIT 1`,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id_nguoidung: Number(row.id_nguoidung),
    id_vaitro: Number(row.id_vaitro),
    ho_ten: row.ho_ten,
    email: row.email,
    sdt: row.sdt,
    avatar: row.avatar,
    ten_vaitro: row.ten_vaitro,
    vai_tro: normalizeRole(row.ten_vaitro),
    trang_thai_tk: row.trang_thai_tk,
    ho_so_ncc: row.id_ncc
      ? {
          id_ncc: Number(row.id_ncc),
          ten_doanh_nghiep: row.ten_doanh_nghiep,
          ma_so_thue: row.ma_so_thue,
          so_tai_khoan: row.so_tai_khoan,
          ty_le_chiet_khau: Number(row.ty_le_chiet_khau),
          trang_thai_duyet: row.trang_thai_ncc,
        }
      : null,
  };
};

/**
 * Middleware xác thực JWT bắt buộc.
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để truy cập tài nguyên này (thiếu Bearer token).',
      });
    }

    const user = await loadUserFromToken(token);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị xóa.',
      });
    }

    const status = String(user.trang_thai_tk || '').toUpperCase();
    if (status === 'BI_KHOA') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
      });
    }

    if (status === 'CHO_XAC_THUC') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản chưa được xác thực OTP.',
        requireVerification: true,
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ.',
      });
    }
    return next(error);
  }
};

/**
 * Middleware xác thực tùy chọn (dùng cho API công khai có cá nhân hóa khi đã đăng nhập).
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    const user = await loadUserFromToken(token);
    const status = String(user?.trang_thai_tk || '').toUpperCase();
    if (user && status === 'HOAT_DONG') {
      req.user = user;
    } else {
      req.user = null;
    }
    return next();
  } catch (_error) {
    req.user = null;
    return next();
  }
};

/**
 * Middleware phân quyền theo vai trò (RBAC: USER / VENDOR / ADMIN).
 * @param {...string} allowedRoles
 */
const authorize = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng.',
      });
    }

    if (!normalizedAllowed.includes(req.user.vai_tro)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện thao tác này. Yêu cầu vai trò: ${normalizedAllowed.join(', ')}.`,
      });
    }

    return next();
  };
};

/**
 * Middleware yêu cầu Nhà cung cấp (Vendor) đã được Admin duyệt hồ sơ ho_so_ncc.
 * Admin luôn được phép đi qua.
 */
const requireApprovedVendor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa xác thực người dùng.',
    });
  }

  if (req.user.vai_tro === ROLES.ADMIN) {
    return next();
  }

  if (req.user.vai_tro !== ROLES.VENDOR) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ nhà cung cấp (Vendor) hoặc quản trị viên mới có quyền truy cập.',
    });
  }

  const approvalStatus = String(req.user.ho_so_ncc?.trang_thai_duyet || '').toUpperCase();
  if (approvalStatus !== 'DA_DUYET') {
    return res.status(403).json({
      success: false,
      message: 'Hồ sơ nhà cung cấp của bạn chưa được duyệt. Vui lòng chờ quản trị viên phê duyệt.',
      vendorStatus: approvalStatus || 'CHUA_CO_HO_SO',
    });
  }

  return next();
};

/**
 * Middleware chỉ cho phép ĐÚNG Nhà cung cấp (VENDOR) đã được duyệt hồ sơ (không cho Admin can thiệp trực tiếp vào vận hành phòng/dịch vụ của khách sạn đối tác).
 */
const requireApprovedVendorOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa xác thực người dùng.',
    });
  }

  if (req.user.vai_tro !== ROLES.VENDOR) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ Nhà cung cấp (Vendor) sở hữu khách sạn mới có quyền thực hiện thao tác vận hành này.',
    });
  }

  const approvalStatus = String(req.user.ho_so_ncc?.trang_thai_duyet || '').toUpperCase();
  if (approvalStatus !== 'DA_DUYET') {
    return res.status(403).json({
      success: false,
      message: 'Hồ sơ nhà cung cấp của bạn chưa được duyệt. Vui lòng chờ quản trị viên phê duyệt.',
      vendorStatus: approvalStatus || 'CHUA_CO_HO_SO',
    });
  }

  return next();
};

const requireAdmin = authorize(ROLES.ADMIN);
const requireVendor = authorize(ROLES.VENDOR, ROLES.ADMIN);
const requireUser = authorize(ROLES.USER, ROLES.VENDOR, ROLES.ADMIN);

module.exports = {
  ROLES,
  normalizeRole,
  authenticate,
  optionalAuth,
  authorize,
  requireAdmin,
  requireVendor,
  requireUser,
  requireApprovedVendor,
  requireApprovedVendorOnly,
};
