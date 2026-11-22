import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CalendarCheck,
  ChevronDown,
  Flame,
  LayoutDashboard,
  LogOut,
  MapPin,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function FlagIcon({ lang }) {
  if (lang === 'en') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ borderRadius: '50%', flexShrink: 0 }}>
        <clipPath id="ukFlag">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
        <g clipPath="url(#ukFlag)">
          <rect width="24" height="24" fill="#012169" />
          <path d="M0 0L24 24M24 0L0 24" stroke="#fff" strokeWidth="4" />
          <path d="M0 0L24 24M24 0L0 24" stroke="#C8102E" strokeWidth="2" />
          <path d="M12 0V24M0 12H24" stroke="#fff" strokeWidth="6" />
          <path d="M12 0V24M0 12H24" stroke="#C8102E" strokeWidth="3.5" />
        </g>
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ borderRadius: '50%', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="12" fill="#DA251D" />
      <polygon
        points="12,5.5 13.7,10.2 18.6,10.2 14.6,13.1 16.1,17.8 12,14.9 7.9,17.8 9.4,13.1 5.4,10.2 10.3,10.2"
        fill="#FFCD00"
      />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState('vi');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/');
  };

  const role = user?.vai_tro || null; // null | 'USER' | 'VENDOR' | 'ADMIN'
  const isGuestOrCustomer = !role || role === 'USER';
  const avatarChar = (user?.ho_ten || 'U').trim().charAt(0).toUpperCase();

  const t =
    lang === 'en'
      ? {
          partner: 'Partner with us',
          explore: 'Explore',
          flash: 'Flash Sale',
          promos: 'Promotions',
          myVouchers: 'My Vouchers',
          destinations: 'Destinations',
          myBooking: 'My Booking',
          vendor: 'Vendor Portal',
          admin: 'Admin Panel',
          adminVendors: 'Partner Management',
          authBtn: 'Sign in / Sign up',
          logout: 'Sign out',
          langLabel: 'EN',
        }
      : {
          partner: 'Hợp tác với chúng tôi',
          explore: 'Khám phá',
          flash: 'Flash Sale',
          promos: 'Ưu đãi',
          myVouchers: 'Kho Voucher',
          destinations: 'Điểm đến',
          myBooking: 'Đặt phòng của tôi',
          vendor: 'Kênh NCC',
          admin: 'Quản trị',
          adminVendors: 'Quản lý NCC',
          authBtn: 'Đăng nhập / Đăng ký',
          logout: 'Đăng xuất',
          langLabel: 'VI',
        };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        {/* CỤM TRÁI: Logo + Hợp tác (chỉ hiện cho khách / USER) */}
        <div className="nav-left">
          <Link to="/" className="brand">
            <span className="brand-badge">
              <Sparkles size={19} />
            </span>
            <span className="brand-text">StayWithUs</span>
          </Link>

          {!user && (
            <>
              <span className="nav-divider" />
              <NavLink
                to="/partner"
                className={({ isActive }) => `nav-partner-link ${isActive ? 'active' : ''}`}
              >
                <Briefcase size={15} />
                <span>{t.partner}</span>
              </NavLink>
            </>
          )}
        </div>

        {/* CỤM GIỮA: Mỗi nút dẫn sang 1 trang riêng thực sự */}
        <nav className="nav-links nav-center">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            {t.explore}
          </NavLink>

          {isGuestOrCustomer && (
            <>
              <NavLink to="/flash-sale" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Flame size={15} color="#ea580c" /> {t.flash}
              </NavLink>
              <NavLink to="/promotions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Ticket size={15} /> {t.promos}
              </NavLink>
              <NavLink to="/destinations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <MapPin size={15} /> {t.destinations}
              </NavLink>
              {role === 'USER' && (
                <NavLink to="/my-vouchers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Ticket size={15} /> {t.myVouchers}
                </NavLink>
              )}
            </>
          )}

          {role === 'VENDOR' && (
            <NavLink to="/vendor" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={15} /> {t.vendor}
            </NavLink>
          )}

          {role === 'ADMIN' && (
            <>
              <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <ShieldCheck size={15} /> {t.admin}
              </NavLink>
              <NavLink to="/admin/vendors" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={15} /> {t.adminVendors}
              </NavLink>
            </>
          )}
        </nav>

        {/* CỤM PHẢI: Đặt phòng (chỉ khách/USER) + icon nhỏ Hợp tác (khi là USER) + Ngôn ngữ + Tài khoản Dropdown */}
        <div className="nav-actions" ref={menuRef}>
          {isGuestOrCustomer && (
            <Link to={user ? '/my-bookings' : '/login'} className="nav-booking-link">
              <CalendarCheck size={16} />
              <span>{t.myBooking}</span>
            </Link>
          )}

          {role === 'USER' && (
            <NavLink
              to="/partner"
              className={({ isActive }) => `nav-icon-btn ${isActive ? 'active' : ''}`}
              title={t.partner}
              aria-label={t.partner}
            >
              <Briefcase size={16} />
            </NavLink>
          )}

          <div className="lang-wrap">
            <button
              type="button"
              className="lang-btn"
              onClick={() => {
                setLangMenuOpen((v) => !v);
                setUserMenuOpen(false);
              }}
            >
              <FlagIcon lang={lang} />
              <span>{t.langLabel}</span>
              <ChevronDown size={14} />
            </button>

            {langMenuOpen && (
              <div className="lang-menu">
                <button
                  type="button"
                  className={`lang-item ${lang === 'vi' ? 'active' : ''}`}
                  onClick={() => {
                    setLang('vi');
                    setLangMenuOpen(false);
                  }}
                >
                  <FlagIcon lang="vi" /> Tiếng Việt
                </button>
                <button
                  type="button"
                  className={`lang-item ${lang === 'en' ? 'active' : ''}`}
                  onClick={() => {
                    setLang('en');
                    setLangMenuOpen(false);
                  }}
                >
                  <FlagIcon lang="en" /> English
                </button>
              </div>
            )}
          </div>

          {user ? (
            <div className="lang-wrap">
              <button
                type="button"
                className="account-trigger"
                onClick={() => {
                  setUserMenuOpen((v) => !v);
                  setLangMenuOpen(false);
                }}
              >
                <span className="account-avatar">{avatarChar}</span>
                <span className="account-role-tag">{user.vai_tro}</span>
                <ChevronDown size={14} />
              </button>

              {userMenuOpen && (
                <div className="account-menu">
                  <div className="account-menu-head">
                    <div className="account-menu-name">{user.ho_ten}</div>
                    <div className="account-menu-email">{user.email}</div>
                  </div>

                  {role === 'USER' && (
                    <>
                      <Link
                        to="/my-bookings"
                        className="lang-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <CalendarCheck size={15} /> {t.myBooking}
                      </Link>
                      <Link
                        to="/my-vouchers"
                        className="lang-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Ticket size={15} /> {t.myVouchers}
                      </Link>
                      <Link
                        to="/partner"
                        className="lang-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Briefcase size={15} /> {t.partner}
                      </Link>
                    </>
                  )}

                  {role === 'VENDOR' && (
                    <Link
                      to="/vendor"
                      className="lang-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <LayoutDashboard size={15} /> {t.vendor}
                    </Link>
                  )}

                  {role === 'ADMIN' && (
                    <>
                      <Link
                        to="/admin"
                        className="lang-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <ShieldCheck size={15} /> {t.admin}
                      </Link>
                      <Link
                        to="/admin/vendors"
                        className="lang-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard size={15} /> {t.adminVendors}
                      </Link>
                    </>
                  )}

                  <div className="account-menu-sep" />
                  <button type="button" className="lang-item account-logout" onClick={handleLogout}>
                    <LogOut size={15} /> {t.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-auth-cta">
              {t.authBtn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
