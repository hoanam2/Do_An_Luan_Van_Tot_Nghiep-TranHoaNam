import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnverifiedEmail('');
    try {
      const res = await apiClient.post('/auth/login', { email, mat_khau: password });
      const { token, user } = res.data.data;
      saveSession(token, user);

      if (user.vai_tro === 'ADMIN') navigate('/admin');
      else if (user.vai_tro === 'VENDOR') navigate('/vendor');
      else navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
      if (err?.response?.data?.requireVerification) {
        setUnverifiedEmail(err.response.data.email || email.trim());
      }
    } finally {
      setLoading(false);
    }
  };

  const goVerifyOtp = () => {
    try {
      localStorage.setItem(
        'staywithus_pending_otp_user',
        JSON.stringify({
          email: unverifiedEmail,
          sdt: '',
          ho_ten: '',
          otpChannel: 'EMAIL',
          expiresAt: Date.now() + 10 * 60 * 1000,
        })
      );
    } catch {
      // ignore
    }
    navigate('/register');
  };

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>Đăng nhập </h1>

        {error && (
          <div className="alert alert-error">
            <div>{error}</div>
            {unverifiedEmail && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 10 }}
                onClick={goVerifyOtp}
              >
                Nhập mã OTP xác thực ngay →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Mật khẩu</label>
            <input
              type="password"
              className="input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
            Điền nhanh tài khoản Demo (sau khi chạy seed:demo):
          </div>
          <div className="chip-row" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="chip"
              onClick={() => fillDemo('khach1@smarthotel.vn', 'User@123')}
            >
              Khách hàng
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => fillDemo('vendor.danang@smarthotel.vn', 'Vendor@123')}
            >
              Vendor (NCC)
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => fillDemo('admin@smarthotel.vn', 'Admin@123')}
            >
              Admin
            </button>
          </div>
        </div>

        <p style={{ marginTop: 18, fontSize: 14, textAlign: 'center', color: 'var(--text-muted)' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Đăng ký nhận OTP
          </Link>
        </p>
      </div>
    </div>
  );
}
