import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Clock, Flame, MapPin, TrendingDown } from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { formatCurrency, getDefaultDates, getHotelCover } from '../utils/format';

const pad2 = (n) => String(n).padStart(2, '0');

export default function FlashSalePage() {
  const defaultDates = getDefaultDates();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [dealTab, setDealTab] = useState('all'); // 'all' | 'under2m'
  const [countdownSec, setCountdownSec] = useState(2 * 3600 + 38 * 60 + 45);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdownSec((prev) => (prev > 0 ? prev - 1 : 3 * 3600));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get('/hotels', { params: { sort_by: 'price_asc', limit: 30 } });
        setHotels(res.data?.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cities = useMemo(() => {
    const set = new Set(hotels.map((h) => h.tinh_thanh).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [hotels]);

  const enrichedHotels = useMemo(
    () =>
      hotels.map((h, idx) => {
        const discountPct = [18, 15, 22, 14, 20, 16][idx % 6];
        const salePrice = Number(h.gia_thap_nhat) || 950000;
        const originalPrice = Math.round(salePrice / (1 - discountPct / 100));
        const saved = Math.max(0, originalPrice - salePrice);
        const score10 = h.diem_danh_gia > 0 ? (Number(h.diem_danh_gia) * 2).toFixed(1) : '9.2';
        return {
          ...h,
          discountPct,
          salePrice,
          originalPrice,
          saved,
          score10,
        };
      }),
    [hotels]
  );

  const cityDeals = useMemo(() => {
    if (selectedCity === 'ALL') return enrichedHotels;
    return enrichedHotels.filter((h) => h.tinh_thanh === selectedCity);
  }, [enrichedHotels, selectedCity]);

  const budgetDeals = useMemo(
    () => enrichedHotels.filter((h) => h.salePrice <= 2000000),
    [enrichedHotels]
  );

  const hours = Math.floor(countdownSec / 3600);
  const minutes = Math.floor((countdownSec % 3600) / 60);
  const seconds = countdownSec % 60;

  return (
    <div>
      {/* Hero Flash Sale */}
      <section className="page-hero">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <span className="hero-eyebrow">
              <Flame size={14} /> Flash Sale khung giờ vàng · StayWithUs
            </span>
            <h1 className="page-hero-title">Deal nóng giảm sâu tại các thành phố du lịch</h1>
            <p className="page-hero-sub">
              Săn giá phòng tốt hơn đến 22% so với giá niêm yết, hủy phòng linh hoạt và xác nhận tức thì.
            </p>
          </div>

          <div className="countdown-wrap" style={{ padding: '12px 20px' }}>
            <Clock size={17} color="#0f766e" />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>Kết thúc sau</span>
            <div className="countdown-boxes">
              <span className="cd-box">{pad2(hours)}</span>:
              <span className="cd-box">{pad2(minutes)}</span>:
              <span className="cd-box">{pad2(seconds)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Khu vực 1: Hot deals in popular cities (giống ảnh mẫu Trivago/Deal) */}
          <div style={{ marginBottom: 38 }}>
            <h2 className="section-title" style={{ marginBottom: 14 }}>
              Deal hot tại các thành phố phổ biến
            </h2>

            {/* Hàng tab thành phố gạch chân */}
            <div className="underline-tabs">
              {cities.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`underline-tab ${selectedCity === c ? 'active' : ''}`}
                  onClick={() => setSelectedCity(c)}
                >
                  {c === 'ALL' ? 'Tất cả ưu đãi' : c}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="card">Đang tải danh sách Flash Sale...</div>
            ) : cityDeals.length === 0 ? (
              <div className="card">Chưa có deal cho thành phố này.</div>
            ) : (
              <div className="trivago-deals-grid">
                {cityDeals.map((h) => (
                  <Link
                    key={h.id_khachsan}
                    to={`/hotels/${h.id_khachsan}?checkIn=${defaultDates.checkIn}&checkOut=${defaultDates.checkOut}`}
                    className="trivago-card"
                  >
                    <div className="trivago-cover">
                      <img src={getHotelCover(h.id_khachsan)} alt={h.ten_khachsan} />
                    </div>
                    <div className="trivago-body">
                      <h3 className="trivago-title">{h.ten_khachsan}</h3>
                      <div className="trivago-city">
                        <MapPin size={12} /> {h.quan_huyen}, {h.tinh_thanh}
                      </div>

                      <div className="trivago-rating">
                        <span className="score-pill">{h.score10}</span>
                        <strong>Xuất sắc</strong>
                        <span style={{ color: 'var(--text-muted)' }}>
                          ({h.so_luot_danh_gia || 12} đánh giá)
                        </span>
                      </div>

                      <div className="deal-drop-badge">
                        <TrendingDown size={13} /> Giảm {h.discountPct}% · Tiết kiệm{' '}
                        {formatCurrency(h.saved)}
                      </div>

                      <div className="trivago-footer">
                        <div>
                          <div className="price-strike">{formatCurrency(h.originalPrice)}</div>
                          <div className="trivago-price">
                            {formatCurrency(h.salePrice)} <span>/ đêm</span>
                          </div>
                          <div className="trivago-perks">
                            {defaultDates.checkIn} → {defaultDates.checkOut} · Miễn phí hủy
                          </div>
                        </div>
                        <span className="trivago-go-btn">
                          <ChevronRight size={18} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Khu vực 2: Deals dưới 2.000.000đ giống phần dưới của ảnh mẫu */}
          <div>
            <div className="underline-tabs" style={{ marginBottom: 18 }}>
              <button
                type="button"
                className={`underline-tab ${dealTab === 'all' ? 'active' : ''}`}
                onClick={() => setDealTab('all')}
              >
                Tất cả deal giá tốt
              </button>
              <button
                type="button"
                className={`underline-tab ${dealTab === 'under2m' ? 'active' : ''}`}
                onClick={() => setDealTab('under2m')}
              >
                Deal dưới 2.000.000₫
              </button>
            </div>

            <div className="section-header" style={{ marginBottom: 16 }}>
              <h2 className="section-title">
                {dealTab === 'under2m' ? 'Ưu đãi dưới 2.000.000₫ / đêm' : 'Khách sạn giảm giá nổi bật'}
              </h2>
              <Link to="/" className="btn btn-outline btn-sm">
                Xem thêm <ArrowRight size={14} />
              </Link>
            </div>

            <div className="trivago-deals-grid">
              {(dealTab === 'under2m' ? budgetDeals : enrichedHotels.slice(0, 4)).map((h) => (
                <Link
                  key={`sub-${h.id_khachsan}`}
                  to={`/hotels/${h.id_khachsan}?checkIn=${defaultDates.checkIn}&checkOut=${defaultDates.checkOut}`}
                  className="trivago-card"
                >
                  <div className="trivago-cover">
                    <img src={getHotelCover(h.id_khachsan)} alt={h.ten_khachsan} />
                  </div>
                  <div className="trivago-body">
                    <h3 className="trivago-title">{h.ten_khachsan}</h3>
                    <div className="trivago-city">
                      <MapPin size={12} /> {h.tinh_thanh}
                    </div>
                    <div className="deal-drop-badge">⚡ Flash Sale -{h.discountPct}%</div>
                    <div className="trivago-footer">
                      <div className="trivago-price">
                        {formatCurrency(h.salePrice)} <span>/ đêm</span>
                      </div>
                      <span className="trivago-go-btn">
                        <ChevronRight size={18} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
