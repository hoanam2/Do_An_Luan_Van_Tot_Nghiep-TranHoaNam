const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let transporter = null;

const isSmtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

/**
 * Gửi email chung qua SMTP.
 * Trong môi trường development, nếu chưa cấu hình SMTP_USER/SMTP_PASS, hệ thống sẽ in nội dung ra console để tiện test.
 */
const sendMail = async ({ to, subject, html, text }) => {
  const mailer = getTransporter();

  if (!mailer) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Chưa cấu hình SMTP_USER và SMTP_PASS để gửi email trong môi trường production.');
    }
    console.warn('==================================================');
    console.warn('[Mailer - DEV FALLBACK] Chưa cấu hình SMTP, bỏ qua gửi email thực tế.');
    console.warn(`To: ${to}`);
    console.warn(`Subject: ${subject}`);
    console.warn(`Text: ${text || '(xem HTML)'}`);
    console.warn('==================================================');
    return { mocked: true, accepted: [to] };
  }

  const from = process.env.MAIL_FROM || `"StayWithUs" <${process.env.SMTP_USER || 'hoanamtran68@gmail.com'}>`;
  return mailer.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

/**
 * Gửi mã OTP 6 số cho đăng ký tài khoản hoặc đặt lại mật khẩu.
 * @param {Object} params
 * @param {string} params.to - Email người nhận
 * @param {string} [params.fullName] - Họ tên người nhận
 * @param {string} params.otp - Mã OTP 6 chữ số
 * @param {number} [params.expiresInMinutes=10] - Thời gian hiệu lực (phút)
 * @param {'REGISTER'|'RESET_PASSWORD'} [params.purpose='REGISTER']
 */
const sendOtpEmail = async ({
  to,
  fullName = 'Quý khách',
  otp,
  expiresInMinutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10,
  purpose = 'REGISTER',
}) => {
  const isReset = purpose === 'RESET_PASSWORD';
  const title = isReset
    ? 'Khôi phục mật khẩu tài khoản'
    : 'Xác thực đăng ký tài khoản';
  const description = isReset
    ? 'Bạn vừa yêu cầu đặt lại mật khẩu trên hệ thống Đặt Phòng Khách Sạn Thông Minh. Vui lòng nhập mã OTP bên dưới để tiếp tục:'
    : 'Cảm ơn bạn đã đăng ký tài khoản trên hệ thống Đặt Phòng Khách Sạn Thông Minh. Vui lòng sử dụng mã OTP bên dưới để hoàn tất xác thực email:';

  const subject = `[StayWithUs] ${title} - Mã OTP: ${otp}`;
  const text = `Xin chào ${fullName},\n\n${description}\n\nMã OTP của bạn là: ${otp}\nMã có hiệu lực trong ${expiresInMinutes} phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.\n\nTrân trọng,\nStayWithUs (hoanamtran68@gmail.com)`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
      <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6;">
        <h2 style="margin: 0; color: #0f766e;">StayWithUs</h2>
        <p style="margin: 6px 0 0; font-size: 14px; color: #6b7280;">${title}</p>
      </div>
      <div style="padding: 20px 0;">
        <p style="margin: 0 0 12px;">Xin chào <strong>${fullName}</strong>,</p>
        <p style="margin: 0 0 20px; line-height: 1.6;">${description}</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 14px 28px; background-color: #f0fdfa; color: #0f766e; border: 1px dashed #14b8a6; border-radius: 8px;">
            ${otp}
          </span>
        </div>
        <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;">
          Mã OTP có hiệu lực trong <strong>${expiresInMinutes} phút</strong>.
        </p>
        <p style="margin: 0; font-size: 13px; color: #9ca3af;">
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ hoanamtran68@gmail.com.
        </p>
      </div>
      <div style="padding-top: 16px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} StayWithUs · hoanamtran68@gmail.com
      </div>
    </div>
  `;

  return sendMail({ to, subject, text, html });
};

/**
 * Kiểm tra cấu hình SMTP khi khởi động (tùy chọn).
 */
const verifyMailer = async () => {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[Mailer] SMTP chưa được cấu hình (đang dùng chế độ log console khi phát triển).');
    return false;
  }
  await mailer.verify();
  console.log('[Mailer] Kết nối SMTP sẵn sàng.');
  return true;
};

module.exports = {
  sendMail,
  sendOtpEmail,
  verifyMailer,
};
