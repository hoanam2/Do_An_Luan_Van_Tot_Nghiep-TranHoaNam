import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Building2, CheckCircle2, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PENDING_PARTNER_OTP_KEY = 'staywithus_pending_otp_partner';

const loadPendingPartnerOtp = () => {
  try {
    const raw = localStorage.getItem(PENDING_PARTNER_OTP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.email || !parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(PENDING_PARTNER_OTP_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export default function PartnerRegisterPage() {
  const navigate = useNavigate();
  const { user, saveSession, refreshProfile } = useAuth();
  const savedPending = loadPendingPartnerOtp();

  // Nếu đang đăng nhập bằng USER -> cho phép nâng cấp thành Vendor qua POST /api/vendors/register
  const isLoggedInUser = user && user.vai_tro === 'USER';

  const [step, setStep] = useState(!isLoggedInUser && savedPending ? 2 : 1);
  const [form, setForm] = useState({
    ho_ten: user?.ho_ten || savedPending?.ho_ten || '',
    email: user?.email || savedPending?.email || '',
    mat_khau: '',
    sdt: user?.sdt || savedPending?.sdt || '',
    ten_doanh_nghiep: '',
    ma_so_thue: '',
    so_tai_khoan: '',
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(
    !isLoggedInUser && savedPending
      ? `Phiên xác thực OTP cho ${savedPending.email} vẫn đang được giữ. Hãy nhập mã OTP 6 số bạn nhận được.`
      : ''
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      if (isLoggedInUser) {
        const res = await apiClient.post('/vendors/register', {
          ten_doanh_nghiep: form.ten_doanh_nghiep,
          ma_so_thue: form.ma_so_thue,
          so_tai_khoan: form.so_tai_khoan,
        });
        await refreshProfile();
        setInfo(
          res.data?.message ||
            'Đã gửi hồ sơ hợp tác nhà cung cấp. Quản trị viên sẽ phê duyệt trong thời gian sớm nhất!'
        );
      } else {
        const res = await apiClient.post('/auth/register', {
          ...form,
          vai_tro: 'VENDOR',
        });
        try {
          localStorage.setItem(
            PENDING_PARTNER_OTP_KEY,
            JSON.stringify({
              email: form.email.trim(),
              sdt: form.sdt.trim(),
              ho_ten: form.ho_ten.trim(),
              expiresAt: Date.now() + 10 * 60 * 1000,
            })
          );
        } catch {
          // ignore
        }
        setInfo(res.data?.message || 'Mã OTP xác thực đã được gửi tới email của bạn.');
        setStep(2);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/verify-otp', {
        email: form.email,
        otp: otp.trim(),
      });
      localStorage.removeItem(PENDING_PARTNER_OTP_KEY);
      const { token, user: loggedUser } = res.data.data;
      saveSession(token, loggedUser);
      navigate('/vendor');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    try {
      const res = await apiClient.post('/auth/resend-otp', { email: form.email });
      setInfo(res.data?.message || 'Đã gửi lại mã OTP.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <span className="hero-eyebrow">
            <Building2 size={14} /> Chương trình Đối tác Khách sạn · StayWithUs
          </span>
          <h1 className="page-hero-title">Hợp tác cùng StayWithUs — Tăng trưởng công suất phòng</h1>
          <p className="page-hero-sub">
            Kết nối khách sạn của bạn tới hàng ngàn khách du lịch thông qua nền tảng tìm kiếm AI
            thông minh, đối soát minh bạch và bảng điều khiển quản trị chuyên nghiệp.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container partner-grid">
          {/* Cột trái: Quyền lợi đối tác */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>
                Vì sao chủ khách sạn chọn StayWithUs?
              </h2>
              <div className="partner-benefits">
                <div className="partner-benefit-item">
                  <span className="benefit-icon">
                    <Sparkles size={20} />
                  </span>
                  <div>
                    <div className="benefit-title">Gợi ý khách hàng chuẩn gu bằng Gemini AI</div>
                    <div className="benefit-desc">
                      Thuật toán Vector Embeddings tự động đưa khách sạn của bạn đến đúng khách có
                      nhu cầu & ngân sách phù hợp.
                    </div>
                  </div>
                </div>

                <div className="partner-benefit-item">
                  <span className="benefit-icon">
                    <TrendingUp size={20} />
                  </span>
                  <div>
                    <div className="benefit-title">Chiết khấu cạnh tranh — minh bạch từng đơn</div>
                    <div className="benefit-desc">
                      Mức chiết khấu mặc định chỉ từ 10%, tự động tính rõ doanh thu thực nhận trên
                      từng đơn đặt phòng.
                    </div>
                  </div>
                </div>

                <div className="partner-benefit-item">
                  <span className="benefit-icon">
                    <BarChart3 size={20} />
                  </span>
                  <div>
                    <div className="benefit-title">Quản lý phòng, lịch đặt & doanh thu 24/7</div>
                    <div className="benefit-desc">
                      Cập nhật giá phòng, trạng thái trống/đang dùng, xác nhận check-in/check-out và
                      xem biểu đồ doanh thu 12 tháng.
                    </div>
                  </div>
                </div>

                <div className="partner-benefit-item">
                  <span className="benefit-icon">
                    <ShieldCheck size={20} />
                  </span>
                  <div>
                    <div className="benefit-title">Chống đặt trùng & hỗ trợ xuất hóa đơn VAT</div>
                    <div className="benefit-desc">
                      Giao dịch đặt phòng an toàn tuyệt đối, hỗ trợ thanh toán VNPay / MoMo / VietQR
                      và xuất hóa đơn điện tử.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: '#f0fdfa', borderColor: '#99f6e4' }}>
              <div style={{ fontWeight: 700, color: '#0f766e', marginBottom: 6 }}>
                Cần tư vấn hợp tác trực tiếp?
              </div>
              <p style={{ fontSize: 13.5, color: '#334155' }}>
                Liên hệ đội ngũ Đối tác StayWithUs qua email{' '}
                <strong>hoanamtran68@gmail.com</strong> hoặc hotline <strong>1900 6868</strong>.
              </p>
            </div>
          </div>

          {/* Cột phải: Form đăng ký Nhà cung cấp riêng biệt */}
          <div className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
              {step === 2
                ? 'Xác thực OTP Đối tác'
                : isLoggedInUser
                ? 'Nâng cấp lên tài khoản Nhà cung cấp'
                : 'Đăng ký trở thành Nhà cung cấp'}
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 18 }}>
              {step === 2
                ? `Nhập mã OTP 6 số đã gửi về ${form.email} để kích hoạt tài khoản đối tác.`
                : 'Điền thông tin doanh nghiệp / khách sạn. Hồ sơ sẽ được quản trị viên duyệt nhanh chóng.'}
            </p>

            {error && <div className="alert alert-error">{error}</div>}
            {info && <div className="alert alert-success">{info}</div>}

            {user && (user.vai_tro === 'VENDOR' || user.vai_tro === 'ADMIN') ? (
              <div style={{ textAlign: 'center', padding: '18px 0' }}>
                <CheckCircle2 size={44} color="#0f766e" style={{ marginBottom: 10 }} />
                <p style={{ marginBottom: 14 }}>
                  Tài khoản <strong>{user.email}</strong> đã có quyền truy cập Kênh Nhà cung cấp.
                </p>
                <Link to="/vendor" className="btn btn-primary">
                  Vào Kênh Nhà cung cấp ngay
                </Link>
              </div>
            ) : step === 1 ? (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!isLoggedInUser && (
                  <>
                    <div className="field">
                      <label>Họ tên người đại diện</label>
                      <input
                        className="input"
                        required
                        placeholder="Nguyễn Văn A"
                        value={form.ho_ten}
                        onChange={(e) => setForm({ ...form, ho_ten: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Email quản trị đối tác</label>
                      <input
                        type="email"
                        className="input"
                        required
                        placeholder="partner@hotel.vn"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Số điện thoại liên hệ</label>
                      <input
                        className="input"
                        placeholder="090xxxxxxx"
                        value={form.sdt}
                        onChange={(e) => setForm({ ...form, sdt: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Mật khẩu (tối thiểu 6 ký tự)</label>
                      <input
                        type="password"
                        className="input"
                        required
                        minLength={6}
                        value={form.mat_khau}
                        onChange={(e) => setForm({ ...form, mat_khau: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="field">
                  <label>Tên doanh nghiệp / Chuỗi khách sạn</label>
                  <input
                    className="input"
                    required
                    placeholder="Công ty TNHH Khách sạn Biển Xanh"
                    value={form.ten_doanh_nghiep}
                    onChange={(e) => setForm({ ...form, ten_doanh_nghiep: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Mã số thuế doanh nghiệp</label>
                  <input
                    className="input"
                    required
                    placeholder="031xxxxxxx"
                    value={form.ma_so_thue}
                    onChange={(e) => setForm({ ...form, ma_so_thue: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Số tài khoản ngân hàng nhận đối soát</label>
                  <input
                    className="input"
                    required
                    placeholder="VCB - 0071000xxxxxx"
                    value={form.so_tai_khoan}
                    onChange={(e) => setForm({ ...form, so_tai_khoan: e.target.value })}
                  />
                </div>

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
                  {loading
                    ? 'Đang gửi hồ sơ...'
                    : isLoggedInUser
                    ? 'Gửi hồ sơ đăng ký Nhà cung cấp'
                    : 'Đăng ký Đối tác & Nhận OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Mã OTP 6 chữ số</label>
                  <input
                    className="input"
                    required
                    maxLength={6}
                    placeholder="123456"
                    style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: 800 }}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Đang xác thực...' : 'Xác thực & Hoàn tất đăng ký Đối tác'}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleResend}>
                  Gửi lại mã OTP
                </button>
              </form>
            )}

            <p style={{ marginTop: 18, fontSize: 13.5, textAlign: 'center', color: 'var(--text-muted)' }}>
              Bạn chỉ muốn đặt phòng?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Đăng ký tài khoản Khách hàng
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
