import { Link } from 'react-router-dom';
import {
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Building2,
  CreditCard,
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Cột 1: Thương hiệu & Liên hệ */}
          <div className="footer-col">
            <Link to="/" className="footer-brand">
              <span className="brand-badge">
                <Sparkles size={18} />
              </span>
              <span>StayWithUs</span>
            </Link>
            <p className="footer-desc">
              Nền tảng đặt phòng khách sạn thông minh tích hợp tìm kiếm ngữ nghĩa Gemini AI,
              so sánh ưu đãi Flash Sale và thanh toán – xuất hóa đơn VAT tức thì trên toàn quốc.
            </p>
            <ul className="footer-contact">
              <li>
                <Phone size={15} /> Hotline CSKH 24/7: <strong>1900 6868</strong>
              </li>
              <li>
                <Mail size={15} /> Email: <strong>hoanamtran68@gmail.com</strong>
              </li>
              <li>
                <MapPin size={15} /> 180 Cao Lỗ, Phường 4, Quận 8, TP. Hồ Chí Minh
              </li>
            </ul>
          </div>

          {/* Cột 2: Về StayWithUs */}
          <div className="footer-col">
            <h4 className="footer-heading">Về StayWithUs</h4>
            <ul className="footer-links">
              <li>
                <Link to="/">Trang chủ & Khám phá</Link>
              </li>
              <li>
                <Link to="/flash-sale">Ưu đãi Flash Sale hôm nay</Link>
              </li>
              <li>
                <Link to="/promotions">Trung tâm Ưu đãi & Khuyến mãi</Link>
              </li>
              <li>
                <Link to="/my-vouchers">Kho Voucher khách hàng</Link>
              </li>
              <li>
                <Link to="/partner">Hợp tác Nhà cung cấp (Vendor)</Link>
              </li>
              <li>
                <Link to="/destinations">Điểm đến du lịch</Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Hỗ trợ khách hàng */}
          <div className="footer-col">
            <h4 className="footer-heading">Hỗ trợ & Chính sách</h4>
            <ul className="footer-links">
              <li>
                <Link to="/my-bookings">Quản lý đơn đặt phòng</Link>
              </li>
              <li>
                <a href="#vouchers">Hướng dẫn áp dụng mã ưu đãi</a>
              </li>
              <li>
                <a href="#special-offers">Chính sách hoàn hủy linh hoạt</a>
              </li>
              <li>
                <a href="#special-offers">Xuất hóa đơn điện tử VAT</a>
              </li>
              <li>
                <a href="#destinations">Bảo mật thông tin khách hàng</a>
              </li>
            </ul>
          </div>

          {/* Cột 4: Ứng dụng, Mã QR & Thanh toán */}
          <div className="footer-col">
            <h4 className="footer-heading">Trải nghiệm & Thanh toán</h4>
            <div className="footer-app-qr-row">
              <div className="footer-qr-card" title="Quét mã VietQR Sacombank">
                <img src="/payment-qr.png" alt="Mã QR thanh toán StayWithUs" />
                <span>Quét VietQR</span>
              </div>
              <div className="app-badges" style={{ flexDirection: 'column', gap: 8 }}>
                <div className="app-badge">
                  <Smartphone size={18} />
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.75 }}>Tải trên</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>App Store</div>
                  </div>
                </div>
                <div className="app-badge">
                  <Smartphone size={18} />
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.75 }}>Tải trên</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Google Play</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="footer-sublabel">
                <CreditCard size={14} /> Phương thức thanh toán hỗ trợ
              </div>
              <div className="pay-badges">
                <span className="pay-pill">VNPay</span>
                <span className="pay-pill">MoMo</span>
                <span className="pay-pill">Chuyển khoản</span>
                <span className="pay-pill">Thẻ tín dụng</span>
                <span className="pay-pill">Tiền mặt</span>
              </div>
            </div>

            <div className="trust-box">
              <ShieldCheck size={18} color="#2dd4bf" />
              <span>Hệ thống xác thực OTP & bảo mật giao dịch chuẩn SSL</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} <strong>StayWithUs</strong> — Dự án Luận văn Đặt Phòng
            Khách Sạn Thông Minh (Node.js · Express · PostgreSQL · Gemini AI).
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Building2 size={14} /> 6+ tỉnh thành du lịch trọng điểm
            </span>
            <span>Điều khoản</span>
            <span>Quyền riêng tư</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
