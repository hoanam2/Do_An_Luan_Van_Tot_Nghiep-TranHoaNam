import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Gift,
  Heart,
  MapPin,
  PawPrint,
  Percent,
  QrCode,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Umbrella,
  Waves,
  Zap,
} from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getDefaultDates, getHotelCover } from '../utils/format';

const AI_PROMPTS = [
  'Resort 5 sao gần biển Đà Nẵng có hồ bơi vô cực',
  'Khách sạn yên tĩnh ở Đà Lạt cho cặp đôi dưới 2 triệu',
  'Khách sạn trung tâm Quận 1 tiện đi công tác có phòng họp',
  'Khách sạn gần biển Nha Trang giá tốt cho gia đình 4 người',
];

const QUICK_CATEGORIES = [
  { id: 'all', label: 'Tất cả phòng', icon: Sparkles, type: 'reset', badge: null },
  { id: 'couple', label: 'Cặp đôi lãng mạn', icon: Heart, type: 'ai', badge: 'HOT', query: 'Khách sạn yên tĩnh lãng mạn cho cặp đôi nghỉ dưỡng' },
  { id: 'beach', label: 'Gần biển view đẹp', icon: Waves, type: 'ai', badge: 'NEW', query: 'Khách sạn gần biển hướng biển có view đẹp' },
  { id: 'luxury', label: 'Khách sạn 5 sao', icon: Star, type: 'filter', badge: null, patch: { hang_sao: '5' } },
  { id: 'budget', label: 'Giá tốt dưới 1.5tr', icon: Zap, type: 'filter', badge: 'DEAL', patch: { max_price: '1500000' } },
  { id: 'resort', label: 'Hồ bơi & Spa', icon: Umbrella, type: 'ai', badge: null, query: 'Resort có hồ bơi vô cực và spa thư giãn' },
  { id: 'business', label: 'Công tác trung tâm', icon: Briefcase, type: 'ai', badge: null, query: 'Khách sạn trung tâm Quận 1 hoặc Hoàn Kiếm tiện đi công tác có phòng họp' },
  { id: 'pet', label: 'Thân thiện thú cưng', icon: PawPrint, type: 'ai', badge: 'NEW', query: 'Khách sạn hoặc villa cho phép mang theo thú cưng' },
];

const DAILY_DEALS = [
  {
    id: 'deal-1',
    kicker: 'MỜI BẠN ĐẶT PHÒNG',
    headline: 'GIẢM NGAY 10%',
    sub: 'Ưu đãi bạn mới — Áp dụng mọi hạng phòng',
    pill: 'MÃ: WELCOME10',
    code: 'WELCOME10',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80',
    theme: 'deal-theme-teal',
  },
  {
    id: 'deal-2',
    kicker: 'DEAL ĐẬM CUỐI TUẦN',
    headline: 'GIẢM 200K',
    sub: 'Nghỉ dưỡng Đà Nẵng, Phú Quốc & Đà Lạt siêu hời',
    pill: 'MÃ: GIAM200K',
    code: 'GIAM200K',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80',
    theme: 'deal-theme-emerald',
  },
  {
    id: 'deal-3',
    kicker: 'TRỢ LÝ GEMINI AI',
    headline: 'TÌM PHÒNG CHUẨN GU',
    sub: 'Gợi ý thông minh theo ngân sách & tiện ích bạn thích',
    pill: 'KHÁM PHÁ AI',
    action: 'ai',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
    theme: 'deal-theme-midnight',
  },
  {
    id: 'deal-4',
    kicker: 'ĐẶT SỚM GIÁ TỐT',
    headline: 'TIẾT KIỆM 20%',
    sub: 'Khách sạn 4–5 sao có hồ bơi vô cực & buffet sáng',
    pill: 'XEM 5 SAO',
    action: 'luxury',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80',
    theme: 'deal-theme-ocean',
  },
];

const ONGOING_PROMO_CARDS = [
  {
    id: 'promo-beach',
    brand: 'STAYWITHUS · BIỂN HÈ',
    title: 'Deal biển siêu hot',
    highlightPrefix: 'Giảm đến',
    highlightValue: '200K',
    note: 'Áp dụng đơn từ 1 đêm · Mã GIAM200K',
    code: 'GIAM200K',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
    variant: 'promo-card-split',
  },
  {
    id: 'promo-explore',
    brand: 'STAYWITHUS · KHÁM PHÁ',
    title: 'Thả ga du lịch\nkhám phá',
    highlightPrefix: 'Giảm ngay',
    highlightValue: '10%',
    note: 'Nhập mã WELCOME10 khi thanh toán',
    code: 'WELCOME10',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=700&q=80',
    variant: 'promo-card-curve',
  },
  {
    id: 'promo-elite',
    brand: 'ĐỐI TÁC ĐỘC QUYỀN',
    title: 'BEST 5-STAR HOTELS',
    highlightPrefix: 'ƯU ĐÃI LÊN ĐẾN',
    highlightValue: '500K',
    note: 'Grand Ocean Bay · Emerald Pearl · Pine Hill',
    action: 'luxury',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
    variant: 'promo-card-luxury',
  },
];

const DESTINATION_PHOTOS = {
  'Đà Nẵng': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=700&q=80',
  'TP. Hồ Chí Minh': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=700&q=80',
  'Lâm Đồng': 'https://images.unsplash.com/photo-1558005530-a7958896ec60?auto=format&fit=crop&w=700&q=80',
  'Kiên Giang': 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=700&q=80',
  'Hà Nội': 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=700&q=80',
  'Khánh Hòa': 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?auto=format&fit=crop&w=700&q=80',
};

const pad2 = (n) => String(n).padStart(2, '0');

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const defaultDates = getDefaultDates();
  const catRailRef = useRef(null);
  const dealsRailRef = useRef(null);
  const [mode, setMode] = useState('standard'); // 'standard' | 'ai'
  const [activeCat, setActiveCat] = useState('all');

  const scrollRail = (ref, direction, distance = 360) => {
    if (!ref.current) return;
    ref.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  const [locations, setLocations] = useState([]);
  const [allHotels, setAllHotels] = useState([]);
  const [hotels, setHotels] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  // Bộ đếm ngược Flash Sale (2 giờ 45 phút)
  const [countdownSec, setCountdownSec] = useState(2 * 3600 + 45 * 60 + 18);

  const [filters, setFilters] = useState({
    keyword: '',
    id_diadiem: '',
    hang_sao: '',
    max_price: '',
    ngay_nhan_phong: defaultDates.checkIn,
    ngay_tra_phong: defaultDates.checkOut,
    so_khach: '2',
    sort_by: 'rating_desc',
  });

  const [aiQuery, setAiQuery] = useState('');
  const [aiMeta, setAiMeta] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec((prev) => (prev > 0 ? prev - 1 : 3 * 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(countdownSec / 3600);
  const minutes = Math.floor((countdownSec % 3600) / 60);
  const seconds = countdownSec % 60;

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [locRes, hotelRes] = await Promise.all([
        apiClient.get('/categories/locations').catch(() => ({ data: { data: [] } })),
        apiClient.get('/hotels', { params: { sort_by: 'rating_desc', limit: 24 } }),
      ]);
      setLocations(locRes.data?.data || []);
      const list = hotelRes.data?.data || [];
      setAllHotels(list);
      setHotels(list);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const fetchStandardHotels = async (customFilters = filters) => {
    setLoading(true);
    setError('');
    setAiMeta(null);
    try {
      const params = {};
      Object.entries(customFilters).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) params[k] = v;
      });
      const res = await apiClient.get('/hotels', { params });
      setHotels(res.data?.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const runAiSearch = async (queryStr = aiQuery) => {
    const q = String(queryStr || '').trim();
    if (!q) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/ai/search', {
        query: q,
        limit: 9,
        ngay_nhan_phong: filters.ngay_nhan_phong || null,
        ngay_tra_phong: filters.ngay_tra_phong || null,
      });
      setHotels(res.data?.data || []);
      setAiMeta({
        mode: res.data?.mode,
        extracted_filters: res.data?.extracted_filters,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyVoucher = (code) => {
    if (!code) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    sessionStorage.setItem('smartstay_copied_voucher', code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  const handleCategoryClick = (cat) => {
    setActiveCat(cat.id);
    if (cat.type === 'reset') {
      const reset = {
        ...filters,
        keyword: '',
        id_diadiem: '',
        hang_sao: '',
        max_price: '',
      };
      setFilters(reset);
      setMode('standard');
      fetchStandardHotels(reset);
      return;
    }
    if (cat.type === 'filter') {
      const next = {
        ...filters,
        keyword: '',
        id_diadiem: '',
        hang_sao: '',
        max_price: '',
        ...cat.patch,
      };
      setFilters(next);
      setMode('standard');
      fetchStandardHotels(next);
      document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (cat.type === 'ai') {
      setMode('ai');
      setAiQuery(cat.query);
      runAiSearch(cat.query);
      document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDestinationClick = (tinhThanh) => {
    const next = {
      ...filters,
      keyword: '',
      id_diadiem: '',
      tinh_thanh: tinhThanh,
      hang_sao: '',
      max_price: '',
    };
    setFilters(next);
    setMode('standard');
    setActiveCat('all');
    fetchStandardHotels(next);
    document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Nhóm địa điểm theo tỉnh thành cho khu vực Điểm đến nổi bật
  const groupedDestinations = Object.values(
    locations.reduce((acc, loc) => {
      const key = loc.tinh_thanh;
      if (!acc[key]) {
        acc[key] = { tinh_thanh: key, so_khach_san: 0 };
      }
      acc[key].so_khach_san += Number(loc.so_khach_san) || 0;
      return acc;
    }, {})
  ).slice(0, 6);

  // Top 4 khách sạn cho mục Flash Sale (tính giá gốc giả lập +18% để hiển thị mức giảm sinh động)
  const flashSaleHotels = allHotels.slice(0, 4);

  return (
    <div>
      {/* 1. HERO + FLOATING SEARCH BAR (GO2JOY STYLE - EMERALD TEAL THEME) */}
      <section className="hero hero-go2joy">
        <div className="container">
          <div className="hero-eyebrow">
            <Sparkles size={14} /> Đặt phòng linh hoạt · Flash Sale mỗi ngày </div>
          <h1 className="hero-title">Chọn phòng ưng ý, giá hời tức thì cùng StayWithUs</h1>
          <p className="hero-sub">
            Săn ưu đãi chớp nhoáng, lưu mã giảm giá độc quyền và tìm khách sạn bằng tiếng Việt tự
            nhiên chỉ trong vài giây.
          </p>

          <div className="search-box">
            <div className="search-tabs">
              <button
                className={`tab-btn ${mode === 'standard' ? 'active' : ''}`}
                onClick={() => setMode('standard')}
              >
                <SlidersHorizontal size={15} /> Đặt phòng theo ngày
              </button>
              <button
                className={`tab-btn ${mode === 'ai' ? 'active' : ''}`}
                onClick={() => setMode('ai')}
              >
                <Sparkles size={15} /> Tìm kiếm AI ngữ nghĩa
              </button>
            </div>

            {mode === 'standard' ? (
              <form
                className="search-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchStandardHotels();
                  document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="field">
                  <label>Bạn muốn đi đâu?</label>
                  <input
                    className="input"
                    placeholder="Đà Nẵng, Đà Lạt, tên khách sạn..."
                    value={filters.keyword}
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value, tinh_thanh: '' })}
                  />
                </div>
                <div className="field">
                  <label>Khu vực</label>
                  <select
                    className="select"
                    value={filters.id_diadiem}
                    onChange={(e) =>
                      setFilters({ ...filters, id_diadiem: e.target.value, tinh_thanh: '' })
                    }
                  >
                    <option value="">Tất cả địa điểm</option>
                    {locations.map((loc) => (
                      <option key={loc.id_diadiem} value={loc.id_diadiem}>
                        {loc.tinh_thanh} — {loc.quan_huyen} ({loc.so_khach_san})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Nhận phòng</label>
                  <input
                    type="date"
                    className="input"
                    value={filters.ngay_nhan_phong}
                    onChange={(e) => setFilters({ ...filters, ngay_nhan_phong: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Trả phòng</label>
                  <input
                    type="date"
                    className="input"
                    value={filters.ngay_tra_phong}
                    onChange={(e) => setFilters({ ...filters, ngay_tra_phong: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Hạng sao</label>
                  <select
                    className="select"
                    value={filters.hang_sao}
                    onChange={(e) => setFilters({ ...filters, hang_sao: e.target.value })}
                  >
                    <option value="">Tất cả</option>
                    <option value="5">5 sao</option>
                    <option value="4">4 sao</option>
                    <option value="3">3 sao</option>
                  </select>
                </div>
                <button className="btn btn-primary" type="submit" style={{ height: 42 }}>
                  <Search size={16} /> Tìm phòng
                </button>
              </form>
            ) : (
              <div>
                <form
                  className="ai-search-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    runAiSearch();
                    document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <input
                    className="ai-search-input"
                    placeholder="Mô tả kỳ nghỉ bạn mong muốn bằng tiếng Việt tự nhiên..."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                  />
                  <button className="btn btn-primary" type="submit" disabled={loading}>
                    <Sparkles size={16} /> Tìm bằng AI
                  </button>
                </form>
                <div className="chip-row">
                  {AI_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="chip"
                      onClick={() => {
                        setAiQuery(p);
                        runAiSearch(p);
                        document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      ✨ {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. THANH DANH MỤC THẺ VUÔNG KIỂU GO2JOY (CÓ NÚT TRƯỢT TRÁI/PHẢI, ẨN SCROLLBAR) */}
      <section className="category-strip">
        <div className="container">
          <div className="category-carousel-wrap">
            <button
              type="button"
              className="cat-arrow cat-arrow-left"
              onClick={() => scrollRail(catRailRef, 'left')}
              aria-label="Trượt sang trái"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="category-card-rail" ref={catRailRef}>
              {QUICK_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`cat-card ${activeCat === cat.id ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(cat)}
                  >
                    <div className="cat-card-icon-wrap">
                      {cat.badge && <span className="cat-card-tag">{cat.badge}</span>}
                      <span className="cat-card-blob" />
                      <Icon size={28} strokeWidth={1.8} className="cat-card-svg" />
                    </div>
                    <span className="cat-card-label">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="cat-arrow cat-arrow-right"
              onClick={() => scrollRail(catRailRef, 'right')}
              aria-label="Trượt sang phải"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* 3. SĂN ƯU ĐÃI MỖI NGÀY (KIỂU GO2JOY "FIND GREAT DEALS EVERY DAY") */}
      <section className="section section-tight" id="special-offers">
        <div className="container">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Gift size={22} color="#0f766e" />
              <h2 className="section-title">Săn ưu đãi mỗi ngày</h2>
            </div>
          </div>

          <div className="deals-carousel-wrap">
            <button
              type="button"
              className="cat-arrow cat-arrow-left"
              onClick={() => scrollRail(dealsRailRef, 'left', 400)}
              aria-label="Ưu đãi trước"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="deals-rail" ref={dealsRailRef}>
              {DAILY_DEALS.map((deal) => (
                <div
                  key={deal.id}
                  className={`deal-banner-card ${deal.theme}`}
                  onClick={() => {
                    if (deal.code) {
                      handleCopyVoucher(deal.code);
                    } else if (deal.action === 'ai') {
                      setMode('ai');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else if (deal.action === 'luxury') {
                      handleCategoryClick(QUICK_CATEGORIES[3]);
                    }
                  }}
                >
                  <img src={deal.image} alt={deal.headline} className="deal-bg-img" />
                  <div className="deal-overlay" />

                  {/* Brand mini góc trái trên */}
                  <div className="deal-brand-mini">
                    <Sparkles size={13} /> StayWithUs
                  </div>

                  {/* Nhãn ticket % góc phải trên giống ảnh mẫu */}
                  <div className="deal-corner-ticket">
                    <span className="deal-ticket-icon">
                      <Percent size={14} strokeWidth={2.6} />
                    </span>
                  </div>

                  <div className="deal-content">
                    <span className="deal-kicker">{deal.kicker}</span>
                    <h3 className="deal-headline">{deal.headline}</h3>
                    <p className="deal-sub">{deal.sub}</p>
                    <span className="deal-action-pill">
                      {deal.code && copiedCode === deal.code ? (
                        <>
                          <Check size={13} /> Đã sao chép {deal.code}
                        </>
                      ) : (
                        deal.pill
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="cat-arrow cat-arrow-right"
              onClick={() => scrollRail(dealsRailRef, 'right', 400)}
              aria-label="Ưu đãi tiếp"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* 4. CHƯƠNG TRÌNH KHUYẾN MÃI ĐANG DIỄN RA (KIỂU "ONGOING PROMOTIONS") */}
      <section className="section section-tight" id="ongoing-promotions">
        <div className="container">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <h2 className="section-title">Chương trình khuyến mãi đang diễn ra</h2>
          </div>

          {/* Banner lớn toàn chiều rộng có QR & nút Xem ưu đãi */}
          <div className="mega-promo-banner">
            <img
              src="https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1400&q=80"
              alt="Siêu khuyến mãi StayWithUs"
              className="mega-promo-bg"
            />
            <div className="mega-promo-overlay" />

            <div className="mega-promo-inner">
              <div className="mega-promo-badge-col">
                <div className="mega-sale-word">
                  <span>SUPER</span>
                  <span className="mega-sale-accent">SALE</span>
                </div>
                <span className="mega-date-pill">17 – 27.11 · STAYWITHUS</span>
              </div>

              <div className="mega-promo-text-col">
                <div className="mega-promo-title">
                  Nhận ưu đãi đặc biệt lên đến <strong>500K VNĐ</strong> tặng Bạn Mới
                </div>
                <div className="mega-promo-note">
                  Áp dụng đặt phòng trực tuyến · Nhập mã WELCOME10 hoặc GIAM200K · Điều khoản áp dụng
                </div>
              </div>

              <div className="mega-promo-qr-col">
                <div className="mega-qr-card">
                  <div className="mega-qr-top">DEAL TỐT MỖI NGÀY</div>
                  <div className="mega-qr-box">
                    <QrCode size={62} color="#0f172a" strokeWidth={1.7} />
                  </div>
                  <button
                    type="button"
                    className="mega-qr-btn"
                    onClick={() => {
                      if (user?.vai_tro === 'USER') navigate('/my-vouchers');
                      else navigate('/login');
                    }}
                  >
                    Xem ưu đãi
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Thẻ khuyến mãi đối tác bên dưới giống ảnh 2 */}
          <div className="ongoing-cards-grid">
            {ONGOING_PROMO_CARDS.map((card) => (
              <div
                key={card.id}
                className={`ongoing-card ${card.variant}`}
                onClick={() => {
                  if (card.code) {
                    handleCopyVoucher(card.code);
                    if (user?.vai_tro === 'USER') navigate('/my-vouchers');
                  } else if (card.action === 'luxury') {
                    handleCategoryClick(QUICK_CATEGORIES[3]);
                  }
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
                        {card.highlightPrefix} {card.highlightValue} MỖI NGÀY
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
        </div>
      </section>

      {/* 4. FLASH SALE VỚI BỘ ĐẾM NGƯỢC LIVE */}
      {flashSaleHotels.length > 0 && (
        <section className="section section-tight" id="flash-sale">
          <div className="container">
            <div className="flash-shell">
              <div className="flash-header">
                <div className="flash-title-wrap">
                  <span className="flash-icon-badge">
                    <Flame size={20} />
                  </span>
                  <div>
                    <h2 className="section-title" style={{ color: '#0f172a' }}>
                      Flash Sale — Giá sốc hôm nay
                    </h2>
                    <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                      Đặt nhanh trước khi hết suất ưu đãi trong khung giờ vàng
                    </p>
                  </div>
                </div>

                <div className="countdown-wrap">
                  <Clock size={15} color="#0f766e" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Kết thúc sau</span>
                  <div className="countdown-boxes">
                    <span className="cd-box">{pad2(hours)}</span>:
                    <span className="cd-box">{pad2(minutes)}</span>:
                    <span className="cd-box">{pad2(seconds)}</span>
                  </div>
                </div>
              </div>

              <div className="flash-grid">
                {flashSaleHotels.map((hotel, i) => {
                  const discountPct = [18, 15, 20, 12][i % 4];
                  const salePrice = Number(hotel.gia_thap_nhat) || 950000;
                  const originalPrice = Math.round(salePrice / (1 - discountPct / 100));
                  return (
                    <Link
                      key={hotel.id_khachsan}
                      to={`/hotels/${hotel.id_khachsan}?checkIn=${filters.ngay_nhan_phong}&checkOut=${filters.ngay_tra_phong}`}
                      className="flash-card"
                    >
                      <div className="flash-cover">
                        <img src={getHotelCover(hotel.id_khachsan)} alt={hotel.ten_khachsan} />
                        <span className="flash-discount-pill">⚡ -{discountPct}%</span>
                        <span className="flash-star-pill">
                          <Star size={12} fill="#f59e0b" color="#f59e0b" /> {hotel.hang_sao || 4}★
                        </span>
                      </div>
                      <div className="flash-body">
                        <div className="flash-name">{hotel.ten_khachsan}</div>
                        <div className="hotel-loc" style={{ fontSize: 12.5 }}>
                          <MapPin size={13} /> {hotel.quan_huyen}, {hotel.tinh_thanh}
                        </div>
                        <div className="flash-price-row">
                          <div>
                            <div className="price-strike">{formatCurrency(originalPrice)}</div>
                            <div className="price-text" style={{ fontSize: 17 }}>
                              {formatCurrency(salePrice)}
                            </div>
                          </div>
                          <span className="badge badge-primary">Còn phòng</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. ĐIỂM ĐẾN PHỔ BIẾN (POPULAR DESTINATIONS) */}
      {groupedDestinations.length > 0 && (
        <section className="section section-tight" id="destinations">
          <div className="container">
            <div className="section-header">
              <div>
                <h2 className="section-title">Điểm đến được yêu thích</h2>
                <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                  Chọn nhanh tỉnh thành để lọc các khách sạn đẹp nhất
                </p>
              </div>
            </div>

            <div className="dest-grid">
              {groupedDestinations.map((d) => (
                <button
                  key={d.tinh_thanh}
                  type="button"
                  className="dest-card"
                  onClick={() => handleDestinationClick(d.tinh_thanh)}
                >
                  <img
                    src={
                      DESTINATION_PHOTOS[d.tinh_thanh] ||
                      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80'
                    }
                    alt={d.tinh_thanh}
                  />
                  <div className="dest-overlay">
                    <div className="dest-name">{d.tinh_thanh}</div>
                    <div className="dest-count">{d.so_khach_san} khách sạn đang mở</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. DANH SÁCH KHÁCH SẠN / KẾT QUẢ TÌM KIẾM */}
      <section className="section" id="hotel-results">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                {aiMeta
                  ? 'Kết quả gợi ý từ AI StayWithUs'
                  : filters.tinh_thanh
                  ? `Khách sạn tại ${filters.tinh_thanh}`
                  : 'Gợi ý khách sạn dành riêng cho bạn'}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Tìm thấy <strong>{hotels.length}</strong> khách sạn phù hợp
                {aiMeta?.mode ? ` · Chế độ: ${aiMeta.mode}` : ''}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {(aiMeta || filters.tinh_thanh || filters.keyword || filters.hang_sao || filters.max_price || filters.id_diadiem) && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleCategoryClick(QUICK_CATEGORIES[0])}
                >
                  Xóa bộ lọc
                </button>
              )}
              {!aiMeta && (
                <select
                  className="select"
                  style={{ width: 210 }}
                  value={filters.sort_by}
                  onChange={(e) => {
                    const next = { ...filters, sort_by: e.target.value };
                    setFilters(next);
                    fetchStandardHotels(next);
                  }}
                >
                  <option value="rating_desc">Đánh giá cao nhất</option>
                  <option value="price_asc">Giá thấp đến cao</option>
                  <option value="price_desc">Giá cao đến thấp</option>
                  <option value="stars_desc">Hạng sao cao nhất</option>
                </select>
              )}
            </div>
          </div>

          {aiMeta?.extracted_filters && (
            <div className="alert alert-info">
              <strong>Bộ lọc AI đã trích xuất:</strong>{' '}
              {Object.entries(aiMeta.extracted_filters)
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ') || 'Tìm kiếm toàn văn theo ngữ nghĩa'}
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              Đang tải danh sách khách sạn...
            </div>
          ) : hotels.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ marginBottom: 12 }}>Chưa có khách sạn phù hợp với tiêu chí tìm kiếm.</p>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleCategoryClick(QUICK_CATEGORIES[0])}
              >
                Xem tất cả khách sạn
              </button>
            </div>
          ) : (
            <div className="hotel-grid">
              {hotels.map((hotel) => (
                <div className="hotel-card" key={hotel.id_khachsan}>
                  <div className="hotel-cover">
                    <img src={getHotelCover(hotel.id_khachsan)} alt={hotel.ten_khachsan} />
                    <div className="cover-badge-top">
                      <span className="pill-dark">
                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        {hotel.hang_sao || 3} sao · {Number(hotel.diem_danh_gia || 0).toFixed(1)} (
                        {hotel.so_luot_danh_gia || 0})
                      </span>
                      {hotel.similarity_score > 0 && (
                        <span className="pill-ai">
                          AI {Math.round(hotel.similarity_score * 100)}% khớp
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hotel-body">
                    <h3 className="hotel-title">{hotel.ten_khachsan}</h3>
                    <div className="hotel-loc">
                      <MapPin size={14} /> {hotel.quan_huyen}, {hotel.tinh_thanh}
                    </div>
                    <p
                      style={{
                        fontSize: 13.5,
                        color: 'var(--text-muted)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {hotel.mo_ta || hotel.dia_chi}
                    </p>

                    {Array.isArray(hotel.tien_ich) && hotel.tien_ich.length > 0 && (
                      <div className="amenity-tags">
                        {hotel.tien_ich.slice(0, 4).map((t, idx) => (
                          <span className="amenity-tag" key={idx}>
                            {typeof t === 'string' ? t : t.ten_tienich}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="hotel-footer">
                      <div>
                        <div className="price-text">{formatCurrency(hotel.gia_thap_nhat)}</div>
                        <div className="price-unit">/ đêm · Xác nhận tức thì</div>
                      </div>
                      <Link
                        to={`/hotels/${hotel.id_khachsan}?checkIn=${filters.ngay_nhan_phong}&checkOut=${filters.ngay_tra_phong}`}
                        className="btn btn-primary btn-sm"
                      >
                        Đặt phòng
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
