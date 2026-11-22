/**
 * Bộ lưu trữ OTP tạm thời có thời hạn (TTL) và chống gửi lại liên tục (cooldown).
 * Lưu trong bộ nhớ tiến trình Node.js để tương thích hoàn toàn với 17 bảng chuẩn
 * mà không cần chỉnh sửa thêm cột vào bảng nguoi_dung.
 */

const otpMap = new Map();

const buildKey = (purpose, email) => `${String(purpose).toUpperCase()}:${String(email).trim().toLowerCase()}`;

const cleanupExpired = () => {
  const now = Date.now();
  for (const [key, entry] of otpMap.entries()) {
    if (entry.expiresAt <= now) {
      otpMap.delete(key);
    }
  }
};

// Tự động dọn dẹp OTP hết hạn mỗi 5 phút (không chặn process exit nhờ unref)
const cleanupTimer = setInterval(cleanupExpired, 5 * 60 * 1000);
if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

const setOtp = ({ email, purpose = 'REGISTER', otp, expiresInMinutes = 10 }) => {
  const now = Date.now();
  const key = buildKey(purpose, email);
  const record = {
    otp: String(otp),
    createdAt: now,
    expiresAt: now + expiresInMinutes * 60 * 1000,
    attempts: 0,
  };
  otpMap.set(key, record);
  return record;
};

const getOtp = ({ email, purpose = 'REGISTER' }) => {
  const key = buildKey(purpose, email);
  const record = otpMap.get(key);
  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    otpMap.delete(key);
    return null;
  }
  return record;
};

const getResendWaitSeconds = ({ email, purpose = 'REGISTER', cooldownSeconds = 60 }) => {
  const record = getOtp({ email, purpose });
  if (!record) return 0;
  const elapsed = Math.floor((Date.now() - record.createdAt) / 1000);
  if (elapsed >= 0 && elapsed < cooldownSeconds) {
    return cooldownSeconds - elapsed;
  }
  return 0;
};

const verifyAndConsumeOtp = ({ email, purpose = 'REGISTER', otpInput, maxAttempts = 5 }) => {
  const key = buildKey(purpose, email);
  const record = otpMap.get(key);

  if (!record) {
    return { valid: false, reason: 'EXPIRED_OR_MISSING' };
  }

  if (record.expiresAt <= Date.now()) {
    otpMap.delete(key);
    return { valid: false, reason: 'EXPIRED' };
  }

  if (record.attempts >= maxAttempts) {
    otpMap.delete(key);
    return { valid: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  if (record.otp !== String(otpInput).trim()) {
    record.attempts += 1;
    return { valid: false, reason: 'INVALID' };
  }

  otpMap.delete(key);
  return { valid: true };
};

const clearOtp = ({ email, purpose = 'REGISTER' }) => {
  otpMap.delete(buildKey(purpose, email));
};

module.exports = {
  setOtp,
  getOtp,
  getResendWaitSeconds,
  verifyAndConsumeOtp,
  clearOtp,
};
