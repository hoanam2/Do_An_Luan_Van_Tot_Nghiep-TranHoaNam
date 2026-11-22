import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Mail, Smartphone } from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_REGEX = /^0\d{9,10}$/;
const NAME_REGEX = /^[\p{L}\s'.-]+$/u;
const PENDING_OTP_KEY = 'staywithus_pending_otp_user';

const loadPendingOtp = () => {
  try {
    const raw = localStorage.getItem(PENDING_OTP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.email || !parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(PENDING_OTP_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const savedPending = loadPendingOtp();

  const [step, setStep] = useState(savedPending ? 2 : 1);
  const [form, setForm] = useState({
    ho_ten: savedPending?.ho_ten || '',
    email: savedPending?.email || '',
    mat_khau: '',
    sdt: savedPending?.sdt || '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [otp, setOtp] = useState('');
  const [otpChannel, setOtpChannel] = useState(savedPending?.otpChannel || 'SMS');
  const [loading, setLoading] = useState(false);
  const [resendingChannel, setResendingChannel] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(
    savedPending
      ? `Phiên xác thực OTP cho ${savedPending.email} vẫn đang được giữ. Hãy nhập mã OTP 6 số bạn vừa nhận.`
      : ''
  );

  const persistPendingOtp = ({ email, sdt, ho_ten, channel }) => {
    try {
      localStorage.setItem(
        PENDING_OTP_KEY,
        JSON.stringify({
          email,
          sdt,
          ho_ten,
          otpChannel: channel,
          expiresAt: Date.now() + 10 * 60 * 1000,
        })
      );
    } catch {
      // ignore storage errors
    }
  };

  const clearPendingOtp = () => {
    localStorage.removeItem(PENDING_OTP_KEY);
  };

  const validateForm = () => {
    const errs = {};
    const missing = [];

    const name = form.ho_ten.trim();
    const email = form.email.trim();
    const phone = form.sdt.trim();
    const pass = form.mat_khau;

    if (!name) {
      missing.push('Họ và tên');
      errs.ho_ten = 'Thiếu họ và tên';
    } else if (name.length < 2 || !NAME_REGEX.test(name)) {
      errs.ho_ten = 'Họ và tên phải có ít nhất 2 ký tự chữ cái và không chứa số/ký tự đặc biệt';
    }

    if (!email) {
      missing.push('Email');
      errs.email = 'Thiếu email';
    } else if (!EMAIL_REGEX.test(email)) {
      errs.email = 'Sai định dạng email';
    }

    if (!phone) {
      missing.push('Số điện thoại');
      errs.sdt = 'Thiếu số điện thoại';
    } else if (!VN_PHONE_REGEX.test(phone)) {
      errs.sdt = 'Số điện thoại phải gồm 10–11 chữ số và bắt đầu bằng số 0';
    }

    if (!pass) {
      missing.push('Mật khẩu');
      errs.mat_khau = 'Thiếu mật khẩu';
    } else if (pass.length < 6) {
      errs.mat_khau = 'Mật khẩu phải có tối thiểu 6 ký tự';
    }

    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      if (missing.length > 0) {
        setError(
          `Cảnh báo: Bạn đã nhập thiếu thông tin (${missing.join(', ')}). Vui lòng nhập đầy đủ và chính xác rồi thử lại.`
        );
      } else {
        setError(
          'Cảnh báo: Bạn đã nhập sai thông tin hoặc sai định dạng. Vui lòng kiểm tra các ô báo đỏ và nhập lại.'
        );
      }
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/register', {
        ho_ten: form.ho_ten.trim(),
        email: form.email.trim(),
        sdt: form.sdt.trim(),
        mat_khau: form.mat_khau,
        vai_tro: 'USER',
      });
      const channel = res.data?.data?.otp_channel || 'SMS';
      setOtpChannel(channel);
      persistPendingOtp({
        email: form.email.trim(),
        sdt: form.sdt.trim(),
        ho_ten: form.ho_ten.trim(),
        channel,
      });
      setInfo(res.data?.message || 'Mã OTP đã được gửi tới số điện thoại của bạn.');
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Cảnh báo: Bạn đã nhập sai định dạng mã OTP (phải gồm đúng 6 chữ số). Vui lòng nhập lại.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-otp', {
        email: form.email.trim(),
        otp: otp.trim(),
      });
      clearPendingOtp();
      const { token, user } = res.data.data;
      saveSession(token, user);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (channel = 'SMS') => {
    setError('');
    setInfo('');
    setResendingChannel(channel);
    try {
      const res = await apiClient.post('/auth/resend-otp', {
        email: form.email.trim(),
        channel,
      });
      const actualChannel = res.data?.data?.otp_channel || channel;
      setOtpChannel(actualChannel);
      persistPendingOtp({
        email: form.email.trim(),
        sdt: form.sdt.trim(),
        ho_ten: form.ho_ten.trim(),
        channel: actualChannel,
      });
      setInfo(
        res.data?.message ||
          (actualChannel === 'EMAIL'
            ? `Đã gửi mã OTP mới qua Email ${form.email.trim()}.`
            : `Đã gửi lại mã OTP qua SMS tới số ${form.sdt.trim()}.`)
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResendingChannel('');
    }
  };

  const handleResetToStep1 = () => {
    clearPendingOtp();
    setStep(1);
    setOtp('');
    setError('');
    setInfo('');
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
          {step === 1 ? 'Đăng ký tài khoản Khách hàng' : 'Xác thực mã OTP'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 18 }}>
          {step === 1
            ? 'Tạo tài khoản StayWithUs để đặt phòng, quản lý lịch sử lưu trú và nhận ưu đãi.'
            : otpChannel === 'SMS'
            ? `Nhập mã OTP 6 chữ số đã gửi qua SMS tới số điện thoại ${form.sdt}.`
            : `Nhập mã OTP 6 chữ số đã gửi tới email ${form.email}.`}
        </p>

        {error && (
          <div className="alert alert-error" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}
        {info && <div className="alert alert-success">{info}</div>}

        {step === 1 ? (
          <form
            noValidate
            autoComplete="off"
            onSubmit={handleRegister}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div className="field">
              <label>Họ và tên *</label>
              <input
                className={`input ${fieldErrors.ho_ten ? 'input-error' : ''}`}
                autoComplete="off"
                value={form.ho_ten}
                onChange={(e) => updateField('ho_ten', e.target.value)}
              />
              {fieldErrors.ho_ten && <span className="field-err-msg">{fieldErrors.ho_ten}</span>}
            </div>

            <div className="field">
              <label>Email *</label>
              <input
                type="email"
                className={`input ${fieldErrors.email ? 'input-error' : ''}`}
                autoComplete="off"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
              {fieldErrors.email && <span className="field-err-msg">{fieldErrors.email}</span>}
            </div>

            <div className="field">
              <label>Số điện thoại *</label>
              <input
                type="tel"
                className={`input ${fieldErrors.sdt ? 'input-error' : ''}`}
                autoComplete="off"
                value={form.sdt}
                onChange={(e) => updateField('sdt', e.target.value)}
              />
              {fieldErrors.sdt && <span className="field-err-msg">{fieldErrors.sdt}</span>}
            </div>

            <div className="field">
              <label>Mật khẩu (tối thiểu 6 ký tự) *</label>
              <input
                type="password"
                className={`input ${fieldErrors.mat_khau ? 'input-error' : ''}`}
                autoComplete="new-password"
                value={form.mat_khau}
                onChange={(e) => updateField('mat_khau', e.target.value)}
              />
              {fieldErrors.mat_khau && <span className="field-err-msg">{fieldErrors.mat_khau}</span>}
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Đang gửi OTP...' : 'Đăng ký & Nhận OTP'}
            </button>
          </form>
        ) : (
          <form noValidate onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 10,
                background: otpChannel === 'SMS' ? '#f0fdfa' : '#eff6ff',
                border: `1px solid ${otpChannel === 'SMS' ? '#99f6e4' : '#bfdbfe'}`,
                color: otpChannel === 'SMS' ? '#0f766e' : '#1d4ed8',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {otpChannel === 'SMS' ? <Smartphone size={16} /> : <Mail size={16} />}
              <span>
                {otpChannel === 'SMS'
                  ? `Kênh hiện tại: SMS (${form.sdt})`
                  : `Kênh hiện tại: Email (${form.email})`}
              </span>
            </div>

            <div className="field">
              <label>Mã OTP 6 chữ số</label>
              <input
                className="input"
                maxLength={6}
                autoComplete="one-time-code"
                style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: 800 }}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Xác thực & Đăng nhập'}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={Boolean(resendingChannel)}
                onClick={() => handleResend('SMS')}
              >
                <Smartphone size={14} />{' '}
                {resendingChannel === 'SMS' ? 'Đang gửi lại SMS...' : 'Gửi lại mã OTP qua SMS'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ borderColor: '#0f766e', color: '#0f766e', background: '#f0fdfa' }}
                disabled={Boolean(resendingChannel)}
                onClick={() => handleResend('EMAIL')}
              >
                <Mail size={14} />{' '}
                {resendingChannel === 'EMAIL'
                  ? 'Đang gửi qua Email...'
                  : 'Không nhận được SMS? Gửi mã OTP qua Email'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ borderStyle: 'dashed', color: 'var(--text-muted)' }}
                onClick={handleResetToStep1}
              >
                <ArrowLeft size={14} /> Quay lại sửa thông tin / Đăng ký tài khoản khác
              </button>
            </div>
          </form>
        )}

        <p style={{ marginTop: 18, fontSize: 14, textAlign: 'center', color: 'var(--text-muted)' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
