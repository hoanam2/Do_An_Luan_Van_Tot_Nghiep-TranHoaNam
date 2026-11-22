import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Flame,
  Heart,
  Image as ImageIcon,
  Info,
  MapPin,
  MessageCircle,
  Sparkles,
  Star,
  Tag,
  Zap,
} from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getDefaultDates, getHotelCover } from '../utils/format';

const GALLERY_POOL = [
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=900&q=80',
];

const getRoomPhoto = (roomTypeId) =>
  GALLERY_POOL[Math.abs(Number(roomTypeId) || 0) % GALLERY_POOL.length];

export default function HotelDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const defaults = getDefaultDates();

  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || defaults.checkIn);
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || defaults.checkOut);
  const [activeNav, setActiveNav] = useState('flash');
  const [liked, setLiked] = useState(false);

  const [hotel, setHotel] = useState(null);
  const [availableRoomsByType, setAvailableRoomsByType] = useState({});
  const [reviewsData, setReviewsData] = useState({ stats: null, data: [] });
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [similarHotels, setSimilarHotels] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const nights = useMemo(() => {
    const s = new Date(`${checkIn}T00:00:00Z`);
    const e = new Date(`${checkOut}T00:00:00Z`);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const loadHotelData = async () => {
    setLoading(true);
    setError('');
    try {
      const [hotelRes, revRes, simRes] = await Promise.all([
        apiClient.get(`/hotels/${id}`, {
          params: { ngay_nhan_phong: checkIn, ngay_tra_phong: checkOut },
        }),
        apiClient.get(`/reviews/hotel/${id}`),
        apiClient.get(`/ai/hotels/${id}/similar?limit=4`),
      ]);

      const h = hotelRes.data?.data;
      setHotel(h);
      setReviewsData({ stats: revRes.data?.stats, data: revRes.data?.data || [] });
      setSimilarHotels(simRes.data?.data || []);

      if (h?.loai_phong?.length) {
        const pairs = await Promise.all(
          h.loai_phong.map(async (rt) => {
            const r = await apiClient.get(`/rooms/types/${rt.id_loaiphong}/rooms`, {
              params: { ngay_nhan_phong: checkIn, ngay_tra_phong: checkOut },
            });
            return [rt.id_loaiphong, r.data?.data || []];
          })
        );
        setAvailableRoomsByType(Object.fromEntries(pairs));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (nights > 0) {
      loadHotelData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, checkIn, checkOut]);

  const openBookingModalForRoomType = (rt) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.vai_tro !== 'USER') {
      setError(`Bạn đang đăng nhập bằng tài khoản ${user.vai_tro}. Chỉ tài khoản Khách hàng (USER) mới được đặt phòng.`);
      return;
    }
    const avail = availableRoomsByType[rt.id_loaiphong] || [];
    if (avail.length === 0) {
      setError('Loại phòng này hiện đã hết phòng trống trong khoảng ngày bạn chọn.');
      return;
    }
    setError('');
    navigate(
      `/checkout?hotelId=${encodeURIComponent(id)}&roomTypeId=${encodeURIComponent(
        rt.id_loaiphong
      )}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
    );
  };

  const handleLoadAiSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await apiClient.get(`/ai/hotels/${id}/review-summary`);
      setAiSummary(res.data?.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingSummary(false);
    }
  };

  const scrollTo = (secId, tabKey) => {
    setActiveNav(tabKey);
    document.getElementById(secId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading && !hotel) {
    return (
      <div className="container section">
        <div className="card">Đang tải thông tin khách sạn...</div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="container section">
        <div className="alert alert-error">{error || 'Không tìm thấy khách sạn.'}</div>
      </div>
    );
  }

  const mainCover = getHotelCover(hotel.id_khachsan);
  const subPhotos = [0, 1, 2, 3].map((i) => GALLERY_POOL[(Number(hotel.id_khachsan) + i) % GALLERY_POOL.length]);
  const avgScore = Number(reviewsData.stats?.diem_trung_binh || hotel.diem_danh_gia || 4.8);
  const displayScore = avgScore > 0 ? avgScore.toFixed(1) : '4.8';
  const totalReviews = reviewsData.stats?.tong_danh_gia ?? hotel.so_luot_danh_gia ?? 0;
  const flashRoomType = (hotel.loai_phong || [])[0] || null;

  return (
    <div className="container section" style={{ paddingTop: 22 }}>
      {/* 1. MOSAIC GALLERY 5 ẢNH (GIỐNG ẢNH 2 GO2JOY) */}
      <div className="mosaic-gallery">
        <div className="mosaic-main">
          <img src={mainCover} alt={hotel.ten_khachsan} />
        </div>
        <div className="mosaic-grid">
          {subPhotos.map((src, idx) => (
            <div key={idx} className="mosaic-sub">
              <img src={src} alt={`${hotel.ten_khachsan} ${idx + 1}`} />
              {idx === 1 && (
                <button
                  type="button"
                  className={`mosaic-heart ${liked ? 'liked' : ''}`}
                  onClick={() => setLiked((v) => !v)}
                  aria-label="Yêu thích"
                >
                  <Heart size={18} fill={liked ? '#dc2626' : 'none'} color={liked ? '#dc2626' : '#334155'} />
                </button>
              )}
              {idx === 3 && (
                <span className="mosaic-count">
                  <ImageIcon size={14} /> {(hotel.loai_phong?.length || 2) * 4 + 5}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. HEADER TÊN KHÁCH SẠN & ĐIỂM ĐÁNH GIÁ */}
      <div className="hd-header-row">
        <div>
          <h1 className="hd-hotel-name">{hotel.ten_khachsan}</h1>
          <div className="hd-address-row">
            <MapPin size={15} color="#0f766e" />
            <span>
              {hotel.dia_chi}, {hotel.quan_huyen}, {hotel.tinh_thanh}
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${hotel.ten_khachsan} ${hotel.dia_chi}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="hd-map-link"
            >
              Xem bản đồ
            </a>
          </div>
        </div>

        <div className="hd-header-right">
          <span className="hd-hot-badge">
            <Flame size={13} /> Nổi bật · {hotel.hang_sao || 4}★
          </span>
          <div className="hd-score-inline">
            <Star size={16} fill="#f59e0b" color="#f59e0b" />
            <strong>{displayScore}</strong>
            <span>({totalReviews} đánh giá)</span>
          </div>
        </div>
      </div>

      {/* 3. THANH SUB-NAV TABS + NÚT CHAT HỖ TRỢ */}
      <div className="hd-tabs-bar">
        <div className="hd-tabs-list">
          <button
            type="button"
            className={`hd-tab ${activeNav === 'flash' ? 'active' : ''}`}
            onClick={() => scrollTo('sec-flash', 'flash')}
          >
            Flash Sale
          </button>
          <button
            type="button"
            className={`hd-tab ${activeNav === 'rooms' ? 'active' : ''}`}
            onClick={() => scrollTo('sec-rooms', 'rooms')}
          >
            Danh sách phòng
          </button>
          <button
            type="button"
            className={`hd-tab ${activeNav === 'reviews' ? 'active' : ''}`}
            onClick={() => scrollTo('sec-reviews', 'reviews')}
          >
            Đánh giá
          </button>
          <button
            type="button"
            className={`hd-tab ${activeNav === 'policy' ? 'active' : ''}`}
            onClick={() => scrollTo('sec-policy', 'policy')}
          >
            Chính sách nhận / trả phòng
          </button>
        </div>

        <a
          href="mailto:hoanamtran68@gmail.com?subject=Hỗ trợ đặt phòng tại StayWithUs"
          className="btn btn-primary btn-sm"
        >
          <MessageCircle size={15} /> Liên hệ khách sạn
        </a>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* 4. KHỐI FLASH SALE (GIỐNG ẢNH 3 — TÔNG XANH NGỌC STAYWITHUS) */}
      {flashRoomType && (
        <section id="sec-flash" className="hd-flash-box">
          <div className="hd-flash-heading">
            <Zap size={20} fill="#0f766e" color="#0f766e" />
            <span>Flash Sale hôm nay</span>
          </div>

          <div className="hd-rooms-grid">
            {(() => {
              const avail = availableRoomsByType[flashRoomType.id_loaiphong] || [];
              const salePrice = Number(flashRoomType.gia_moi_dem);
              const origPrice = Math.round(salePrice / 0.82);
              return (
                <div className="hd-room-card">
                  <div className="hd-room-img">
                    <img src={getRoomPhoto(flashRoomType.id_loaiphong)} alt={flashRoomType.ten_loaiphong} />
                  </div>
                  <div className="hd-room-body">
                    <h3 className="hd-room-title">{flashRoomType.ten_loaiphong}</h3>
                    <div className="hd-room-meta">
                      Sức chứa {flashRoomType.suc_chua} người
                      {flashRoomType.dien_tich ? ` · ${flashRoomType.dien_tich} m²` : ''}
                    </div>
                    <div className="hd-room-badges">
                      <span className="hd-flash-pill">Flash Sale ⚡ -18%</span>
                      <span className="hd-left-pill">Chỉ còn {avail.length} phòng trống</span>
                    </div>
                    <div className="hd-room-price-row">
                      <div>
                        <div className="hd-price-main">
                          {formatCurrency(salePrice)}
                          <span className="price-strike" style={{ marginLeft: 8 }}>
                            {formatCurrency(origPrice)}
                          </span>
                        </div>
                        <div className="price-unit">/ đêm ({nights} đêm)</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={avail.length === 0}
                        onClick={() => openBookingModalForRoomType(flashRoomType)}
                      >
                        {avail.length === 0 ? 'Hết phòng' : 'Đặt ngay'}
                      </button>
                    </div>
                    <div className="hd-pay-note">
                      <CreditCard size={14} /> Hỗ trợ VNPay, MoMo, VietQR Sacombank hoặc trả tại quầy
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* 5. KHỐI DANH SÁCH PHÒNG (GIỐNG ẢNH 4) */}
      <section id="sec-rooms" style={{ marginTop: 32 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <h2 className="section-title">Danh sách phòng</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              Chọn ngày nhận và trả phòng để xem chính xác số phòng còn trống ({nights} đêm)
            </p>
          </div>
          <div className="hd-date-bar">
            <div className="field" style={{ gap: 2 }}>
              <label>Nhận phòng</label>
              <input
                type="date"
                className="input"
                style={{ padding: '7px 10px' }}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="field" style={{ gap: 2 }}>
              <label>Trả phòng</label>
              <input
                type="date"
                className="input"
                style={{ padding: '7px 10px' }}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="hd-rooms-grid">
          {(hotel.loai_phong || []).map((rt, idx) => {
            const avail = availableRoomsByType[rt.id_loaiphong] || [];
            const pct = [18, 22, 15, 20][idx % 4];
            const salePrice = Number(rt.gia_moi_dem);
            const origPrice = Math.round(salePrice / (1 - pct / 100));

            return (
              <div className="hd-room-card" key={rt.id_loaiphong}>
                <div className="hd-room-img">
                  <img src={getRoomPhoto(rt.id_loaiphong + 1)} alt={rt.ten_loaiphong} />
                </div>
                <div className="hd-room-body">
                  <h3 className="hd-room-title">{rt.ten_loaiphong}</h3>
                  <div className="hd-room-meta">
                    Sức chứa {rt.suc_chua} người {rt.dien_tich ? `· ${rt.dien_tich} m²` : ''}
                    {rt.mo_ta_lp ? ` · ${rt.mo_ta_lp}` : ''}
                  </div>

                  <div className="hd-room-badges">
                    <span className="hd-pct-pill">-{pct}%</span>
                    <span className="hd-left-pill">
                      {avail.length > 0 ? `Chỉ còn ${avail.length} phòng trống` : 'Hết phòng'}
                    </span>
                  </div>

                  <div className="hd-room-price-row">
                    <div>
                      <div className="hd-price-main">
                        {formatCurrency(salePrice)}
                        <span className="price-strike" style={{ marginLeft: 8 }}>
                          {formatCurrency(origPrice)}
                        </span>
                      </div>
                      <div className="price-unit">/ đêm</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={avail.length === 0}
                      onClick={() => openBookingModalForRoomType(rt)}
                    >
                      {avail.length === 0 ? 'Hết phòng' : 'Đặt ngay'}
                    </button>
                  </div>

                  <div className="hd-pay-note">
                    <CreditCard size={14} /> Thanh toán linh hoạt · Xuất hóa đơn VAT
                  </div>
                  <div className="hd-room-foot">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Info size={13} /> Hủy miễn phí trước nhận phòng
                    </span>
                    <button
                      type="button"
                      className="hd-room-detail-link"
                      onClick={() => openBookingModalForRoomType(rt)}
                      disabled={avail.length === 0}
                    >
                      Chọn phòng <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tiện ích & Mô tả khách sạn */}
        <div className="card" style={{ marginTop: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Tiện ích & Giới thiệu</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            {hotel.mo_ta || 'Không gian lưu trú tiện nghi, hiện đại và sạch sẽ.'}
          </p>
          <div className="amenity-tags">
            {(hotel.tien_ich || []).map((t) => (
              <span key={t.id_tienich} className="amenity-tag" style={{ fontSize: 13, padding: '6px 12px' }}>
                <CheckCircle2 size={13} style={{ marginRight: 5, verticalAlign: -2, color: '#0f766e' }} />
                {t.ten_tienich}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 6. KHỐI ĐÁNH GIÁ KIỂU GO2JOY (GIỐNG ẢNH 5 — KHÔNG CÓ FORM VIẾT ĐÁNH GIÁ KHI CHƯA Ở) */}
      <section id="sec-reviews" style={{ marginTop: 38 }}>
        <div className="section-header" style={{ marginBottom: 18 }}>
          <h2 className="section-title">Đánh giá từ khách đã lưu trú</h2>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleLoadAiSummary}
            disabled={loadingSummary}
          >
            <Sparkles size={15} /> {loadingSummary ? 'AI đang tóm tắt...' : 'AI Tóm tắt đánh giá'}
          </button>
        </div>

        <div className="hd-review-top">
          <div className="hd-score-box-wrap">
            <div className="hd-score-big">{displayScore}</div>
            <div>
              <div className="hd-score-label">Xuất sắc</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                {totalReviews} đánh giá đã xác thực từ khách hàng StayWithUs
              </div>
              <div style={{ fontSize: 12, color: '#0f766e', marginTop: 4 }}>
                * Chỉ khách đã hoàn thành lưu trú mới có thể đánh giá trong mục Đơn đặt phòng của tôi.
              </div>
            </div>
          </div>

          <div className="hd-bars-col">
            {[
              { label: 'Độ sạch sẽ', val: Math.min(5, Number(displayScore) || 4.8) },
              { label: 'Tiện nghi', val: Math.min(5, Math.max(4, (Number(displayScore) || 4.8) - 0.1)) },
              { label: 'Dịch vụ', val: Math.min(5, (Number(displayScore) || 4.8) + 0.1) },
            ].map((item) => (
              <div className="hd-bar-row" key={item.label}>
                <span className="hd-bar-name">{item.label}:</span>
                <div className="hd-bar-track">
                  <div className="hd-bar-fill" style={{ width: `${(item.val / 5) * 100}%` }} />
                </div>
                <span className="hd-bar-val">{item.val.toFixed(1)}/5</span>
              </div>
            ))}
          </div>
        </div>

        {aiSummary && (
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              ✨ Tóm tắt AI ({aiSummary.so_danh_gia_phan_tich} đánh giá · {aiSummary.cam_xuc_tong_the})
            </div>
            <p style={{ marginBottom: 6 }}>{aiSummary.tom_tat}</p>
            {aiSummary.diem_noi_bat?.length > 0 && (
              <div style={{ fontSize: 13 }}>
                <strong>Ưu điểm:</strong> {aiSummary.diem_noi_bat.join(' · ')}
              </div>
            )}
            {aiSummary.diem_can_cai_thien?.length > 0 && (
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <strong>Cần cải thiện:</strong> {aiSummary.diem_can_cai_thien.join(' · ')}
              </div>
            )}
          </div>
        )}

        <div className="hd-review-cards">
          {reviewsData.data.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
              Chưa có đánh giá nào từ khách hàng.
            </div>
          ) : (
            reviewsData.data.map((rv) => (
              <div className="hd-review-card" key={rv.id_danhgia}>
                <div className="hd-review-head">
                  <div className="hd-review-avatar">
                    {(rv.ho_ten || 'K').trim().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{rv.ho_ten}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      Khách đã lưu trú tại {hotel.ten_khachsan}
                    </div>
                  </div>
                </div>
                <div style={{ color: '#f59e0b', fontSize: 14, margin: '8px 0 6px' }}>
                  {'★'.repeat(rv.so_sao)}
                  {'☆'.repeat(5 - rv.so_sao)}
                </div>
                <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.5 }}>{rv.noi_dung}</p>
                {rv.phan_hoi_ncc && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 10px',
                      background: '#f0fdfa',
                      borderLeft: '3px solid #0f766e',
                      borderRadius: 6,
                      fontSize: 12.5,
                    }}
                  >
                    <strong>Phản hồi từ khách sạn:</strong> {rv.phan_hoi_ncc}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 7. CHÍNH SÁCH NHẬN / TRẢ PHÒNG + KHUNG HỖ TRỢ + KHÁCH HÀNG CŨNG ĐÃ XEM (GIỐNG ẢNH 6) */}
      <section id="sec-policy" style={{ marginTop: 38 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>
          Chính sách nhận / trả phòng
        </h2>
        <div className="hd-policy-grid">
          <div>
            <div className="hd-policy-title">Theo giờ</div>
            <div className="hd-policy-time">09:00 – 22:00</div>
          </div>
          <div>
            <div className="hd-policy-title">Qua đêm</div>
            <div className="hd-policy-time">22:00 – 12:00</div>
          </div>
          <div>
            <div className="hd-policy-title">Theo ngày</div>
            <div className="hd-policy-time">14:00 – 12:00</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
          Lưu ý: Chính sách hủy phòng phụ thuộc vào loại phòng và thời điểm đặt phòng trên StayWithUs.
        </p>

        <div className="hd-support-box">
          <div>
            <div style={{ fontSize: 14, color: '#334155', marginBottom: 10 }}>
              Bạn có câu hỏi về phòng hoặc dịch vụ? Liên hệ trực tiếp với StayWithUs để được hỗ trợ 24/7.
            </div>
            <a
              href="mailto:hoanamtran68@gmail.com?subject=Hỗ trợ đặt phòng StayWithUs"
              className="btn btn-sm"
              style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}
            >
              <MessageCircle size={15} /> Liên hệ hỗ trợ (hoanamtran68@gmail.com)
            </a>
          </div>
        </div>
      </section>

      {similarHotels.length > 0 && (
        <section style={{ marginTop: 38 }}>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            Khách hàng cũng đã xem
          </h2>
          <div className="hd-similar-grid">
            {similarHotels.map((sh) => (
              <Link
                key={sh.id_khachsan}
                to={`/hotels/${sh.id_khachsan}?checkIn=${checkIn}&checkOut=${checkOut}`}
                className="flash-card"
              >
                <div className="flash-cover">
                  <img src={getHotelCover(sh.id_khachsan)} alt={sh.ten_khachsan} />
                  <span className="flash-star-pill">
                    <Star size={12} fill="#f59e0b" color="#f59e0b" /> {sh.hang_sao || 4}★
                  </span>
                </div>
                <div className="flash-body">
                  <div className="flash-name">{sh.ten_khachsan}</div>
                  <div className="hotel-loc" style={{ fontSize: 12.5 }}>
                    <MapPin size={12} /> {sh.quan_huyen}, {sh.tinh_thanh}
                  </div>
                  <div className="price-text" style={{ fontSize: 16, marginTop: 6 }}>
                    {formatCurrency(sh.gia_thap_nhat)}
                    <span className="price-unit"> / đêm</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
