import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy, Gift, Search, Sparkles } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

const SPECIAL_PROMOS = [
  {
    id: 'sp-1',
    kicker: 'ƯU ĐÃI THÀNH VIÊN MỚI',
    title: 'Giảm ngay 10% cho đơn đặt phòng đầu tiên',
    sub: 'Áp dụng cho toàn bộ khách sạn trên StayWithUs. Nhập mã WELCOME10.',
    code: 'WELCOME10',
    category: 'all',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80',
    theme: 'deal-theme-teal',
  },
  {
    id: 'sp-2',
    kicker: 'SIÊU DEAL NGHỈ DƯỠNG',
    title: 'Trừ thẳng 200.000đ cho kỳ nghỉ cuối tuần',
    sub: 'Dành cho Đà Nẵng, Phú Quốc, Đà Lạt, Nha Trang. Nhập mã GIAM200K.',
    code: 'GIAM200K',
    category: 'beach',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80',
    theme: 'deal-theme-emerald',
  },
  {
    id: 'sp-3',
    kicker: 'MỞ KHÓA ƯU ĐÃI AI',
    title: 'Tìm deal hời đúng ngân sách bằng Gemini AI',
    sub: 'Nhập nhu cầu tự nhiên — AI tự lọc khách sạn giá tốt nhất cho bạn.',
    action: 'ai',
    category: 'luxury',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
    theme: 'deal-theme-midnight',
  },
];

const OTHER_PROMOS = [
  {
    id: 'op-1',
    brand: 'STAYWITHUS · BIỂN HÈ',
    title: 'Deal biển siêu hot — Đà Nẵng & Phú Quốc',
    highlightPrefix: 'Giảm đến',
    highlightValue: '200K',
    note: 'Áp dụng mã GIAM200K · Hủy miễn phí',
    code: 'GIAM200K',
    category: 'beach',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
    variant: 'promo-card-split',
  },
  {
    id: 'op-2',
    brand: 'STAYWITHUS · KHÁM PHÁ',
    title: 'Thả ga du lịch\nĐà Lạt & Hà Nội',
    highlightPrefix: 'Giảm ngay',
    highlightValue: '10%',
    note: 'Nhập mã WELCOME10 khi thanh toán',
    code: 'WELCOME10',
    category: 'weekend',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=700&q=80',
    variant: 'promo-card-curve',
  },
  {
    id: 'op-3',
    brand: 'ĐỐI TÁC ĐỘC QUYỀN 5 SAO',
    title: 'BEST 5-STAR HOTELS',
    highlightPrefix: 'ƯU ĐÃI ĐẾN',
    highlightValue: '500K',
    note: 'Grand Ocean Bay · Emerald Pearl · Saigon Central',
    action: 'flash',
    category: 'luxury',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
    variant: 'promo-card-luxury',
  },
  {
    id: 'op-4',
    brand: 'STAYWITHUS · CÔNG TÁC',
    title: 'Khách sạn trung tâm Quận 1 & Hoàn Kiếm',
    highlightPrefix: 'Giảm ngay',
    highlightValue: '10%',
    note: 'Hỗ trợ xuất hóa đơn điện tử VAT nhanh chóng',
    code: 'WELCOME10',
    category: 'business',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=700&q=80',
    variant: 'promo-card-split',
  },
  {
    id: 'op-5',
    brand: 'STAYWITHUS · GIA ĐÌNH',
    title: 'Kỳ nghỉ biển\nNha Trang giá mềm',
    highlightPrefix: 'Tiết kiệm',
    highlightValue: '200K',
    note: 'Áp dụng phòng gia đình 4 người · Mã GIAM200K',
    code: 'GIAM200K',
    category: 'beach',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=80',
    variant: 'promo-card-curve',
  },
  {
    id: 'op-6',
    brand: 'KHUNG GIỜ VÀNG',
    title: 'FLASH SALE MỖI NGÀY',
    highlightPrefix: 'GIẢM SÂU TỚI',
    highlightValue: '22%',
    note: 'Số lượng phòng ưu đãi có hạn mỗi ngày',
    action: 'flash',
    category: 'weekend',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
    variant: 'promo-card-luxury',
  },
];

const PROMO_TABS = [
  { id: 'all', label: 'Tất cả ưu đãi' },
  { id: 'beach', label: 'Khách sạn biển' },
  { id: 'luxury', label: 'Nghỉ dưỡng 5 sao' },
  { id: 'weekend', label: 'Cuối tuần' },
  { id: 'business', label: 'Công tác & VAT' },
];

export default function PromotionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [copiedCode, setCopiedCode] = useState('');
  const [exclusiveEvents, setExclusiveEvents] = useState([]);

  useEffect(() => {
    apiClient
      .get('/events')
      .then((res) => setExclusiveEvents(res.data?.data || []))
      .catch(() => {});
  }, []);

  const handleCopy = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    sessionStorage.setItem('smartstay_copied_voucher', code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  const filteredOther = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return OTHER_PROMOS.filter((item) => {
      const matchTab = activeTab === 'all' || item.category === activeTab;
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q));
      return matchTab && matchQuery;
    });
  }, [activeTab, keyword]);

  return (
    <div>
      {/* Hero Tìm kiếm Deal */}
      <section className="page-hero">
        <div className="container">
          <span className="hero-eyebrow">
            <Gift size={14} /> Trung tâm Ưu đãi & Khuyến mãi · StayWithUs
          </span>
          <h1 className="page-hero-title">Khám phá hàng loạt ưu đãi & deal đặt phòng tốt nhất</h1>
          <p className="page-hero-sub">
            Tìm nhanh chương trình khuyến mãi theo thành phố, loại hình nghỉ dưỡng hoặc lưu mã giảm
            giá để áp dụng ngay khi đặt phòng.
          </p>

          <div className="promo-search-bar">
            <Search size={18} color="#0f766e" />
            <input
              placeholder="Tìm ưu đãi theo từ khóa: biển, Đà Lạt, 5 sao, VAT, WELCOME10..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {user?.vai_tro === 'USER' && (
              <Link to="/my-vouchers" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                Kho Voucher của tôi
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Special Promotions (giống Ảnh 3 - Traveloka Special Promotions) */}
      <section className="section">
        <div className="container">
          <h2 className="promo-center-heading">Ưu đãi đặc biệt (Special Promotions)</h2>

          <div className="ongoing-cards-grid" style={{ marginBottom: 44 }}>
            {SPECIAL_PROMOS.map((p) => (
              <div
                key={p.id}
                className={`deal-banner-card ${p.theme}`}
                style={{ width: '100%', flex: 'unset' }}
                onClick={() => {
                  if (p.code) handleCopy(p.code);
                  else navigate('/');
                }}
              >
                <img src={p.image} alt={p.title} className="deal-bg-img" />
                <div className="deal-overlay" />
                <div className="deal-brand-mini">
                  <Sparkles size={13} /> StayWithUs
                </div>
                <div className="deal-content">
                  <span className="deal-kicker">{p.kicker}</span>
                  <h3 className="deal-headline" style={{ fontSize: 20 }}>
                    {p.title}
                  </h3>
                  <p className="deal-sub">{p.sub}</p>
                  <span className="deal-action-pill">
                    {p.code ? (
                      copiedCode === p.code ? (
                        <>
                          <Check size={13} /> Đã sao chép {p.code}
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Lấy mã {p.code}
                        </>
                      )
                    ) : (
                      'Khám phá ngay'
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Sự kiện đặc quyền từ Admin StayWithUs */}
          {exclusiveEvents.length > 0 && (
            <div style={{ marginBottom: 44 }}>
              <h2 className="promo-center-heading">Sự kiện & Đặc quyền dành cho Khách hàng</h2>
              <div className="offers-grid">
                {exclusiveEvents.map((ev) => (
                  <div key={ev.id_sukien} className="offer-banner offer-teal">
                    <span className="offer-badge">{ev.doi_tuong}</span>
                    <h3 className="offer-title">{ev.tieu_de}</h3>
                    <p className="offer-desc">{ev.mo_ta}</p>
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.16)',
                        padding: '8px 12px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      ✨ Đặc quyền: {ev.dac_quyen}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <span style={{ fontSize: 11.5, opacity: 0.85 }}>
                        Đến {formatDate(ev.ngay_ketthuc)}
                      </span>
                      {ev.ma_voucher_kem && (
                        <button
                          type="button"
                          className="offer-cta"
                          onClick={() => handleCopy(ev.ma_voucher_kem)}
                        >
                          {copiedCode === ev.ma_voucher_kem ? (
                            <>
                              <Check size={13} /> Đã lưu {ev.ma_voucher_kem}
                            </>
                          ) : (
                            <>
                              <Copy size={13} /> Lấy mã {ev.ma_voucher_kem}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Promotions với thanh Pill lọc giống Ảnh 3 */}
          <h2 className="promo-center-heading">Các chương trình khuyến mãi khác</h2>

          <div className="promo-filter-pills">
            {PROMO_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`promo-pill-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredOther.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              Không tìm thấy ưu đãi nào khớp với &ldquo;{keyword}&rdquo;.
            </div>
          ) : (
            <div className="ongoing-cards-grid">
              {filteredOther.map((card) => (
                <div
                  key={card.id}
                  className={`ongoing-card ${card.variant}`}
                  onClick={() => {
                    if (card.code) handleCopy(card.code);
                    else if (card.action === 'flash') navigate('/flash-sale');
                  }}
                >
                  {card.variant === 'promo-card-split' && (
                    <>
                      <div className="split-left">
                        <span className="ongoing-brand">{card.brand}</span>
                        <div className="ongoing-title">{card.title}</div>
                        <div className="ongoing-big">
                          <span>{card.highlightPrefix}</span>
                          <strong>{card.highlightValue}</strong>
                        </div>
                        <div className="ongoing-foot">
                          {copiedCode === card.code ? `✓ Đã sao chép ${card.code}` : card.note}
                        </div>
                      </div>
                      <div className="split-right">
                        <img src={card.image} alt={card.title} />
                      </div>
                    </>
                  )}

                  {card.variant === 'promo-card-curve' && (
                    <>
                      <img src={card.image} alt={card.title} className="curve-bg" />
                      <div className="curve-shape" />
                      <div className="curve-content">
                        <span className="ongoing-brand">{card.brand}</span>
                        <div className="ongoing-title" style={{ whiteSpace: 'pre-line' }}>
                          {card.title}
                        </div>
                        <div className="ongoing-big">
                          <span>{card.highlightPrefix}</span>
                          <strong>{card.highlightValue}</strong>
                        </div>
                        <div className="ongoing-foot">
                          {copiedCode === card.code ? `✓ Đã sao chép ${card.code}` : card.note}
                        </div>
                      </div>
                    </>
                  )}

                  {card.variant === 'promo-card-luxury' && (
                    <>
                      <img src={card.image} alt={card.title} className="luxury-bg" />
                      <div className="luxury-overlay" />
                      <div className="luxury-content">
                        <span className="luxury-badge">{card.brand}</span>
                        <div className="luxury-title">{card.title}</div>
                        <div className="luxury-pill">
                          {card.highlightPrefix} {card.highlightValue}
                        </div>
                        <div className="ongoing-foot" style={{ color: '#e2e8f0' }}>
                          {card.note}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
