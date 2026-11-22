const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Chuẩn hóa số điện thoại Việt Nam (0xxxxxxxxx -> +84xxxxxxxxx).
 */
const formatVietnamPhoneE164 = (phone) => {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('84')) return `+${digits}`;
  if (digits.startsWith('0')) return `+84${digits.slice(1)}`;
  return `+84${digits}`;
};

const isTwilioConfigured = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );

/**
 * Gửi mã OTP qua SMS (hỗ trợ Twilio REST API trực tiếp bằng fetch của Node 24).
 * Trong môi trường development chưa cấu hình Twilio, tự động in mã OTP ra console để tiện test.
 */
const sendOtpSms = async ({
  to,
  fullName = 'Quý khách',
  otp,
  expiresInMinutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10,
}) => {
  const e164Phone = formatVietnamPhoneE164(to);
  const bodyText = `[StayWithUs] Ma OTP xac thuc dang ky cua ${fullName} la: ${otp}. Hieu luc ${expiresInMinutes} phut. Khong chia se ma nay cho bat ky ai.`;

  if (!isTwilioConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Chưa cấu hình cổng gửi SMS (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER).');
    }

    console.warn('==================================================');
    console.warn('[SMS OTP - DEV FALLBACK] Chưa cấu hình cổng SMS thực tế, hiển thị OTP trên console:');
    console.warn(`To Phone: ${to} (${e164Phone})`);
    console.warn(`Message : ${bodyText}`);
    console.warn('==================================================');
    return { mocked: true, channel: 'SMS', to: e164Phone };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const formBody = new URLSearchParams({
    To: e164Phone,
    From: fromNumber,
    Body: bodyText,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gửi SMS thất bại (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return { mocked: false, channel: 'SMS', sid: data.sid, to: e164Phone };
};

module.exports = {
  formatVietnamPhoneE164,
  isTwilioConfigured,
  sendOtpSms,
};
