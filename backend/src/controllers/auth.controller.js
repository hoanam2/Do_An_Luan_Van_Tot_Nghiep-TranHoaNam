const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendOtpEmail } = require('../utils/mailer');
const { sendOtpSms } = require('../utils/sms');
const otpStore = require('../utils/otpStore');
const { ROLES, normalizeRole } = require('../middlewares/auth.middleware');

const maskPhone = (phone) => {
  const s = String(phone || '').trim();
  if (s.length < 7) return s;
  return `${s.slice(0, 3)}****${s.slice(-3)}`;
};

const maskEmail = (email) => {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
};

const BCRYPT_SALT_ROUNDS = 10;
const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES) || 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_REGEX = /^0\d{9,10}$/;
const NAME_REGEX = /^[\p{L}\s'.-]+$/u;

const generateOtpCode = () => String(crypto.randomInt(100000, 1000000));

const signAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Thiếu biến môi trường JWT_SECRET.');
  }

  return jwt.sign(
    {
      id_nguoidung: Number(user.id_nguoidung),
      email: user.email,
      vai_tro: normalizeRole(user.ten_vaitro || user.vai_tro),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

const formatUserResponse = (row) => ({
  id_nguoidung: Number(row.id_nguoidung),
  id_vaitro: Number(row.id_vaitro),
  ho_ten: row.ho_ten,
  email: row.email,
  sdt: row.sdt || null,
  avatar: row.avatar || null,
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
        trang_thai_duyet: row.trang_thai_duyet,
      }
    : null,
});

/**
 * Tìm bản ghi vai_tro trong DB tương ứng với vai trò chuẩn (USER / VENDOR / ADMIN).
 */
const findRoleInDb = async (client, targetRole) => {
  const rolesRes = await client.query('SELECT id_vaitro, ten_vaitro FROM vai_tro');
  return rolesRes.rows.find((r) => normalizeRole(r.ten_vaitro) === targetRole) || null;
};

/**
 * POST /api/auth/register
 * Đăng ký tài khoản mới (USER hoặc VENDOR) và gửi mã OTP 6 số qua email.
 */
const register = async (req, res, next) => {
  try {
    const {
      ho_ten,
      email,
      mat_khau,
      sdt = null,
      vai_tro = ROLES.USER,
      ten_doanh_nghiep = null,
      ma_so_thue = null,
      so_tai_khoan = null,
    } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const trimmedName = String(ho_ten || '').trim();
    const trimmedPhone = String(sdt || '').trim();
    const requestedRole = normalizeRole(vai_tro || ROLES.USER);

    const missingFields = [];
    if (!trimmedName) missingFields.push('Họ và tên');
    if (!normalizedEmail) missingFields.push('Email');
    if (!trimmedPhone) missingFields.push('Số điện thoại');
    if (!mat_khau) missingFields.push('Mật khẩu');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Bạn đã nhập thiếu thông tin (${missingFields.join(', ')}). Vui lòng nhập đầy đủ và thử lại.`,
      });
    }

    if (trimmedName.length < 2 || !NAME_REGEX.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        message: 'Họ và tên không hợp lệ (tối thiểu 2 ký tự, không chứa số hoặc ký tự đặc biệt). Vui lòng nhập lại.',
      });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã nhập sai định dạng email. Vui lòng kiểm tra và nhập lại.',
      });
    }

    if (!VN_PHONE_REGEX.test(trimmedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã nhập sai định dạng số điện thoại (phải gồm 10-11 chữ số và bắt đầu bằng số 0). Vui lòng nhập lại.',
      });
    }

    if (String(mat_khau).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu chưa đạt yêu cầu (phải có ít nhất 6 ký tự). Vui lòng nhập lại.',
      });
    }

    if (![ROLES.USER, ROLES.VENDOR].includes(requestedRole)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ được phép đăng ký với vai trò Khách hàng hoặc Nhà cung cấp.',
      });
    }

    if (requestedRole === ROLES.VENDOR) {
      const missingVendor = [];
      if (!String(ten_doanh_nghiep || '').trim()) missingVendor.push('Tên doanh nghiệp');
      if (!String(ma_so_thue || '').trim()) missingVendor.push('Mã số thuế');
      if (!String(so_tai_khoan || '').trim()) missingVendor.push('Số tài khoản ngân hàng');

      if (missingVendor.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Bạn đã nhập thiếu thông tin doanh nghiệp (${missingVendor.join(', ')}). Vui lòng nhập đầy đủ và thử lại.`,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(String(mat_khau), BCRYPT_SALT_ROUNDS);
    const otp = generateOtpCode();

    const registeredUser = await db.withTransaction(async (client) => {
      const roleRow = await findRoleInDb(client, requestedRole);
      if (!roleRow) {
        const err = new Error(
          `Không tìm thấy vai trò "${requestedRole}" trong bảng vai_tro. Hãy chạy lệnh "npm run seed" để khởi tạo dữ liệu vai trò.`
        );
        err.statusCode = 500;
        throw err;
      }

      const existingRes = await client.query(
        'SELECT id_nguoidung, trang_thai_tk FROM nguoi_dung WHERE LOWER(email) = $1 LIMIT 1',
        [normalizedEmail]
      );

      // Kiểm tra trùng số điện thoại với tài khoản khác
      const phoneDupRes = await client.query(
        'SELECT id_nguoidung FROM nguoi_dung WHERE sdt = $1 AND LOWER(email) <> $2 LIMIT 1',
        [trimmedPhone, normalizedEmail]
      );
      if (phoneDupRes.rowCount > 0) {
        const err = new Error(
          'Thông tin của người đăng ký đã bị trùng (số điện thoại đã được sử dụng). Vui lòng kiểm tra và nhập lại.'
        );
        err.statusCode = 409;
        throw err;
      }

      // Nếu đăng ký VENDOR -> kiểm tra trùng mã số thuế với NCC khác
      if (requestedRole === ROLES.VENDOR) {
        const currentExistingId = existingRes.rowCount > 0 ? Number(existingRes.rows[0].id_nguoidung) : -1;
        const taxDupRes = await client.query(
          'SELECT id_ncc FROM ho_so_ncc WHERE ma_so_thue = $1 AND id_nguoidung <> $2 LIMIT 1',
          [String(ma_so_thue).trim(), currentExistingId]
        );
        if (taxDupRes.rowCount > 0) {
          const err = new Error(
            'Thông tin của người đăng ký đã bị trùng (mã số thuế doanh nghiệp đã tồn tại). Vui lòng kiểm tra và nhập lại.'
          );
          err.statusCode = 409;
          throw err;
        }
      }

      let userId;

      if (existingRes.rowCount > 0) {
        const existing = existingRes.rows[0];
        if (String(existing.trang_thai_tk || '').toUpperCase() !== 'CHO_XAC_THUC') {
          const err = new Error(
            'Thông tin của người đăng ký đã bị trùng (email này đã được đăng ký trước đó). Vui lòng kiểm tra và nhập lại.'
          );
          err.statusCode = 409;
          throw err;
        }

        // Tài khoản chưa xác thực OTP -> cập nhật thông tin & cấp lại OTP mới
        const updateRes = await client.query(
          `UPDATE nguoi_dung
           SET ho_ten = $1,
               mat_khau = $2,
               sdt = $3,
               id_vaitro = $4,
               trang_thai_tk = 'CHO_XAC_THUC'
           WHERE id_nguoidung = $5
           RETURNING id_nguoidung`,
          [trimmedName, hashedPassword, trimmedPhone, roleRow.id_vaitro, existing.id_nguoidung]
        );
        userId = Number(updateRes.rows[0].id_nguoidung);
      } else {
        const insertRes = await client.query(
          `INSERT INTO nguoi_dung (
             id_vaitro, ho_ten, email, mat_khau, sdt, trang_thai_tk
           )
           VALUES ($1, $2, $3, $4, $5, 'CHO_XAC_THUC')
           RETURNING id_nguoidung`,
          [roleRow.id_vaitro, trimmedName, normalizedEmail, hashedPassword, trimmedPhone]
        );
        userId = Number(insertRes.rows[0].id_nguoidung);
      }

      // Tạo hoặc cập nhật hồ sơ nhà cung cấp (chờ Admin duyệt) nếu đăng ký VENDOR
      if (requestedRole === ROLES.VENDOR) {
        const vendorCheck = await client.query(
          'SELECT id_ncc FROM ho_so_ncc WHERE id_nguoidung = $1 LIMIT 1',
          [userId]
        );
        if (vendorCheck.rowCount === 0) {
          await client.query(
            `INSERT INTO ho_so_ncc (
               id_nguoidung, ten_doanh_nghiep, ma_so_thue, so_tai_khoan, trang_thai_duyet
             )
             VALUES ($1, $2, $3, $4, 'CHO_DUYET')`,
            [
              userId,
              String(ten_doanh_nghiep).trim(),
              String(ma_so_thue).trim(),
              String(so_tai_khoan).trim(),
            ]
          );
        } else {
          await client.query(
            `UPDATE ho_so_ncc
             SET ten_doanh_nghiep = $1,
                 ma_so_thue = $2,
                 so_tai_khoan = $3,
                 trang_thai_duyet = 'CHO_DUYET'
             WHERE id_nguoidung = $4`,
            [
              String(ten_doanh_nghiep).trim(),
              String(ma_so_thue).trim(),
              String(so_tai_khoan).trim(),
              userId,
            ]
          );
        }
      }

      return {
        id_nguoidung: userId,
        ho_ten: trimmedName,
        email: normalizedEmail,
        sdt: trimmedPhone,
        vai_tro: requestedRole,
      };
    });

    const otpRecord = otpStore.setOtp({
      email: registeredUser.email,
      purpose: 'REGISTER',
      otp,
      expiresInMinutes: OTP_EXPIRES_MINUTES,
    });

    // Khách hàng (USER): ưu tiên gửi OTP qua Số điện thoại (SMS); nếu gửi SMS lỗi tự động chuyển sang Email
    let sentChannel = 'EMAIL';
    if (registeredUser.vai_tro === ROLES.USER && registeredUser.sdt) {
      try {
        await sendOtpSms({
          to: registeredUser.sdt,
          fullName: registeredUser.ho_ten,
          otp,
          expiresInMinutes: OTP_EXPIRES_MINUTES,
        });
        sentChannel = 'SMS';
      } catch (smsErr) {
        console.warn('[Auth] Gửi SMS OTP thất bại, tự động chuyển sang Email:', smsErr.message);
        await sendOtpEmail({
          to: registeredUser.email,
          fullName: registeredUser.ho_ten,
          otp,
          expiresInMinutes: OTP_EXPIRES_MINUTES,
          purpose: 'REGISTER',
        });
        sentChannel = 'EMAIL';
      }
    } else {
      await sendOtpEmail({
        to: registeredUser.email,
        fullName: registeredUser.ho_ten,
        otp,
        expiresInMinutes: OTP_EXPIRES_MINUTES,
        purpose: 'REGISTER',
      });
      sentChannel = 'EMAIL';
    }
    otpRecord.channel = sentChannel;

    const message =
      sentChannel === 'SMS'
        ? `Đăng ký thành công. Mã OTP 6 số đã được gửi qua SMS tới số điện thoại ${maskPhone(registeredUser.sdt)}. Nếu không nhận được, bạn có thể chọn gửi qua Email.`
        : `Đăng ký thành công. Mã OTP xác thực đã được gửi tới email ${registeredUser.email}.`;

    return res.status(201).json({
      success: true,
      message,
      data: {
        id_nguoidung: registeredUser.id_nguoidung,
        email: registeredUser.email,
        sdt: registeredUser.sdt,
        masked_phone: maskPhone(registeredUser.sdt),
        masked_email: maskEmail(registeredUser.email),
        vai_tro: registeredUser.vai_tro,
        otp_channel: sentChannel,
        otp_expires_minutes: OTP_EXPIRES_MINUTES,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Xác thực mã OTP sau khi đăng ký, kích hoạt trang_thai_tk = 'HOAT_DONG' và cấp JWT.
 */
const verifyOtp = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    const otpInput = String(req.body.otp || '').trim();

    if (!normalizedEmail || !otpInput) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email và mã OTP.',
      });
    }

    const userRes = await db.query(
      `SELECT
         nd.id_nguoidung, nd.id_vaitro, nd.ho_ten, nd.email, nd.sdt, nd.avatar, nd.trang_thai_tk,
         vt.ten_vaitro,
         ncc.id_ncc, ncc.ten_doanh_nghiep, ncc.ma_so_thue, ncc.so_tai_khoan, ncc.ty_le_chiet_khau, ncc.trang_thai_duyet
       FROM nguoi_dung nd
       INNER JOIN vai_tro vt ON nd.id_vaitro = vt.id_vaitro
       LEFT JOIN ho_so_ncc ncc ON ncc.id_nguoidung = nd.id_nguoidung
       WHERE LOWER(nd.email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này.',
      });
    }

    const user = userRes.rows[0];
    if (String(user.trang_thai_tk || '').toUpperCase() === 'HOAT_DONG') {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản này đã được xác thực trước đó. Bạn có thể đăng nhập ngay.',
      });
    }

    const verification = otpStore.verifyAndConsumeOtp({
      email: normalizedEmail,
      purpose: 'REGISTER',
      otpInput,
    });

    if (!verification.valid) {
      const reasonMessages = {
        EXPIRED_OR_MISSING: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.',
        EXPIRED: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.',
        TOO_MANY_ATTEMPTS: 'Bạn đã nhập sai OTP quá số lần quy định. Vui lòng yêu cầu gửi lại mã mới.',
        INVALID: 'Mã OTP không chính xác.',
      };
      return res.status(400).json({
        success: false,
        message: reasonMessages[verification.reason] || 'Xác thực OTP thất bại.',
      });
    }

    await db.query(
      `UPDATE nguoi_dung
       SET trang_thai_tk = 'HOAT_DONG'
       WHERE id_nguoidung = $1`,
      [user.id_nguoidung]
    );

    user.trang_thai_tk = 'HOAT_DONG';
    const token = signAccessToken(user);

    return res.status(200).json({
      success: true,
      message: 'Xác thực OTP thành công.',
      data: {
        token,
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/resend-otp
 * Gửi lại mã OTP cho tài khoản đang ở trạng thái CHO_XAC_THUC.
 * Hỗ trợ chọn kênh gửi: channel = 'SMS' (mặc định với USER) hoặc 'EMAIL' (fallback khi không nhận được SMS).
 */
const resendOtp = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    const requestedChannel = String(req.body.channel || 'EMAIL').trim().toUpperCase();
    const channel = ['SMS', 'EMAIL'].includes(requestedChannel) ? requestedChannel : 'EMAIL';

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email.',
      });
    }

    const userRes = await db.query(
      `SELECT id_nguoidung, ho_ten, email, sdt, trang_thai_tk
       FROM nguoi_dung
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này.',
      });
    }

    const user = userRes.rows[0];
    if (String(user.trang_thai_tk || '').toUpperCase() !== 'CHO_XAC_THUC') {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được xác thực. Vui lòng đăng nhập.',
      });
    }

    // Cho phép chuyển ngay sang EMAIL fallback nếu khách không nhận được SMS; chỉ giới hạn 60s khi gửi lặp cùng kênh
    const existingOtp = otpStore.getOtp({ email: normalizedEmail, purpose: 'REGISTER' });
    const isSwitchingToEmail = channel === 'EMAIL' && existingOtp?.channel === 'SMS';

    if (!isSwitchingToEmail) {
      const waitSeconds = otpStore.getResendWaitSeconds({
        email: normalizedEmail,
        purpose: 'REGISTER',
        cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      });
      if (waitSeconds > 0) {
        return res.status(429).json({
          success: false,
          message: `Vui lòng chờ ${waitSeconds} giây trước khi yêu cầu gửi lại mã OTP qua ${channel}.`,
        });
      }
    }

    const otp = generateOtpCode();
    const record = otpStore.setOtp({
      email: user.email,
      purpose: 'REGISTER',
      otp,
      expiresInMinutes: OTP_EXPIRES_MINUTES,
    });
    record.channel = channel;

    let actualChannel = channel;
    if (channel === 'SMS' && user.sdt) {
      try {
        await sendOtpSms({
          to: user.sdt,
          fullName: user.ho_ten,
          otp,
          expiresInMinutes: OTP_EXPIRES_MINUTES,
        });
      } catch (smsErr) {
        console.warn('[Auth] Gửi lại SMS OTP thất bại, chuyển sang Email:', smsErr.message);
        await sendOtpEmail({
          to: user.email,
          fullName: user.ho_ten,
          otp,
          expiresInMinutes: OTP_EXPIRES_MINUTES,
          purpose: 'REGISTER',
        });
        actualChannel = 'EMAIL';
        record.channel = 'EMAIL';
      }
    } else {
      await sendOtpEmail({
        to: user.email,
        fullName: user.ho_ten,
        otp,
        expiresInMinutes: OTP_EXPIRES_MINUTES,
        purpose: 'REGISTER',
      });
      actualChannel = 'EMAIL';
      record.channel = 'EMAIL';
    }

    return res.status(200).json({
      success: true,
      message:
        actualChannel === 'SMS'
          ? `Mã OTP mới đã được gửi qua SMS tới số điện thoại ${maskPhone(user.sdt)}.`
          : `Mã OTP mới đã được gửi tới email ${user.email}. Vui lòng kiểm tra hộp thư.`,
      data: {
        otp_channel: actualChannel,
        masked_phone: maskPhone(user.sdt),
        masked_email: maskEmail(user.email),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/login
 * Đăng nhập bằng email & mật khẩu, trả về JWT + thông tin phân quyền (User / Vendor / Admin).
 */
const login = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.mat_khau || '');

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ email và mật khẩu.',
      });
    }

    const userRes = await db.query(
      `SELECT
         nd.id_nguoidung, nd.id_vaitro, nd.ho_ten, nd.email, nd.mat_khau, nd.sdt, nd.avatar, nd.trang_thai_tk,
         vt.ten_vaitro,
         ncc.id_ncc, ncc.ten_doanh_nghiep, ncc.ma_so_thue, ncc.so_tai_khoan, ncc.ty_le_chiet_khau, ncc.trang_thai_duyet
       FROM nguoi_dung nd
       INNER JOIN vai_tro vt ON nd.id_vaitro = vt.id_vaitro
       LEFT JOIN ho_so_ncc ncc ON ncc.id_nguoidung = nd.id_nguoidung
       WHERE LOWER(nd.email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    const user = userRes.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.mat_khau);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.',
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
        message: 'Tài khoản chưa được xác thực OTP. Vui lòng xác thực email trước khi đăng nhập.',
        requireVerification: true,
        email: user.email,
      });
    }

    const token = signAccessToken(user);

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      data: {
        token,
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email tài khoản.',
      });
    }

    const userRes = await db.query(
      'SELECT id_nguoidung, ho_ten, email, trang_thai_tk FROM nguoi_dung WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (
      userRes.rowCount === 0 ||
      String(userRes.rows[0].trang_thai_tk || '').toUpperCase() !== 'HOAT_DONG'
    ) {
      return res.status(200).json({
        success: true,
        message: 'Nếu email hợp lệ và đang hoạt động, mã OTP khôi phục mật khẩu đã được gửi.',
      });
    }

    const user = userRes.rows[0];
    const otp = generateOtpCode();
    otpStore.setOtp({
      email: user.email,
      purpose: 'RESET_PASSWORD',
      otp,
      expiresInMinutes: OTP_EXPIRES_MINUTES,
    });

    await sendOtpEmail({
      to: user.email,
      fullName: user.ho_ten,
      otp,
      expiresInMinutes: OTP_EXPIRES_MINUTES,
      purpose: 'RESET_PASSWORD',
    });

    return res.status(200).json({
      success: true,
      message: 'Nếu email hợp lệ và đang hoạt động, mã OTP khôi phục mật khẩu đã được gửi.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    const otpInput = String(req.body.otp || '').trim();
    const newPassword = String(req.body.mat_khau_moi || '');

    if (!normalizedEmail || !otpInput || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ email, mã OTP và mật khẩu mới.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
      });
    }

    const verification = otpStore.verifyAndConsumeOtp({
      email: normalizedEmail,
      purpose: 'RESET_PASSWORD',
      otpInput,
    });

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    const updateRes = await db.query(
      'UPDATE nguoi_dung SET mat_khau = $1 WHERE LOWER(email) = $2 RETURNING id_nguoidung',
      [hashedPassword, normalizedEmail]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const oldPassword = String(req.body.mat_khau_cu || '');
    const newPassword = String(req.body.mat_khau_moi || '');

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
      });
    }

    const userRes = await db.query(
      'SELECT mat_khau FROM nguoi_dung WHERE id_nguoidung = $1 LIMIT 1',
      [req.user.id_nguoidung]
    );

    const isMatch = await bcrypt.compare(oldPassword, userRes.rows[0].mat_khau);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu cũ không chính xác.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await db.query(
      'UPDATE nguoi_dung SET mat_khau = $1 WHERE id_nguoidung = $2',
      [hashedPassword, req.user.id_nguoidung]
    );

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
};
