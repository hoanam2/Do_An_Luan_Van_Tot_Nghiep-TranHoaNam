import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { formatCurrency, getDefaultDates, getHotelCover } from '../utils/format';

const DESTINATION_PHOTOS = {
  'Đà Nẵng': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
  'TP. Hồ Chí Minh': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
  'Lâm Đồng': 'https://images.unsplash.com/photo-1558005530-a7958896ec60?auto=format&fit=crop&w=800&q=80',
  'Kiên Giang': 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80',
  'Hà Nội': 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=800&q=80',
  'Khánh Hòa': 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?auto=format&fit=crop&w=800&q=80',
};

export default function DestinationsPage() {
  const defaultDates = getDefaultDates();
  const [locations, setLocations] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [locRes, hotelRes] = await Promise.all([
          apiClient.get('/categories/locations'),
          apiClient.get('/hotels', { params: { sort_by: 'rating_desc', limit: 24 } }),
        ]);
        setLocations(locRes.data?.data || []);
        setHotels(hotelRes.data?.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const grouped = Object.values(
    locations.reduce((acc, loc) => {
      if (!acc[loc.tinh_thanh]) {
        acc[loc.tinh_thanh] = { tinh_thanh: loc.tinh_thanh, quan_huyen_list: [], so_khach_san: 0 };
      }
      acc[loc.tinh_thanh].quan_huyen_list.push(loc.quan_huyen);
      acc[loc.tinh_thanh].so_khach_san += Number(loc.so_khach_san) || 0;
      return acc;
    }, {})
  );

  const visibleHotels = selectedCity
    ? hotels.filter((h) => h.tinh_thanh === selectedCity)
    : hotels;

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <span className="hero-eyebrow">
            <MapPin size={14} /> Khám phá điểm đến Việt Nam · StayWithUs
          </span>
          <h1 className="page-hero-title">Điểm đến du lịch hàng đầu trên toàn quốc</h1>
          <p className="page-hero-sub">
            Chọn tỉnh thành bạn muốn ghé thăm để khám phá các khách sạn, resort và khu nghỉ dưỡng
            chất lượng nhất.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="dest-grid" style={{ marginBottom: 32 }}>
            {grouped.map((d) => {
              const active = selectedCity === d.tinh_thanh;
              return (
                <button
                  key={d.tinh_thanh}
                  type="button"
                  className="dest-card"
                  style={{
                    height: 185,
                    outline: active ? '3px solid #0f766e' : 'none',
                    outlineOffset: 2,
                  }}
                  onClick={() => setSelectedCity(active ? '' : d.tinh_thanh)}
                >
                  <img
                    src={
                      DESTINATION_PHOTOS[d.tinh_thanh] ||
                      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={d.tinh_thanh}
                  />
                  <div className="dest-overlay">
                    <div className="dest-name">{d.tinh_thanh}</div>
                    <div className="dest-count">
                      {d.so_khach_san} khách sạn · {d.quan_huyen_list.slice(0, 2).join(', ')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="section-header">
            <div>
              <h2 className="section-title">
                {selectedCity ? `Khách sạn tại ${selectedCity}` : 'Tất cả khách sạn theo điểm đến'}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Hiển thị <strong>{visibleHotels.length}</strong> khách sạn
              </p>
            </div>
            {selectedCity && (
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedCity('')}>
                Xem tất cả tỉnh thành
              </button>
            )}
          </div>

          {loading ? (
            <div className="card">Đang tải dữ liệu điểm đến...</div>
          ) : (
            <div className="hotel-grid">
              {visibleHotels.map((hotel) => (
                <div className="hotel-card" key={hotel.id_khachsan}>
                  <div className="hotel-cover">
                    <img src={getHotelCover(hotel.id_khachsan)} alt={hotel.ten_khachsan} />
                    <div className="cover-badge-top">
                      <span className="pill-dark">
                        <Star size={13} fill="#f59e0b" color="#f59e0b" /> {hotel.hang_sao || 3} sao ·{' '}
                        {Number(hotel.diem_danh_gia || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="hotel-body">
                    <h3 className="hotel-title">{hotel.ten_khachsan}</h3>
                    <div className="hotel-loc">
                      <MapPin size={14} /> {hotel.quan_huyen}, {hotel.tinh_thanh}
                    </div>
                    <div className="hotel-footer">
                      <div>
                        <div className="price-text">{formatCurrency(hotel.gia_thap_nhat)}</div>
                        <div className="price-unit">/ đêm</div>
                      </div>
                      <Link
                        to={`/hotels/${hotel.id_khachsan}?checkIn=${defaultDates.checkIn}&checkOut=${defaultDates.checkOut}`}
                        className="btn btn-primary btn-sm"
                      >
                        Xem phòng
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
