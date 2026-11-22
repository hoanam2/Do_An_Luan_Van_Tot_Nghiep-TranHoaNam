import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Sparkles, Ticket } from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';

export default function MyVouchersPage() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get('/vouchers');
        setVouchers(res.data?.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCopy = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    sessionStorage.setItem('smartstay_copied_voucher', code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  const handleUseNow = (code) => {
    sessionStorage.setItem('smartstay_copied_voucher', code);
    navigate('/');
    setTimeout(() => {
      document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <div className="container section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="brand-badge">
            <Ticket size={20} />
          </span>
          <div>
            <h1 className="section-title">Kho Voucher của tôi</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Danh sách mã giảm giá đang hiệu lực dành riêng cho thành viên StayWithUs.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="card">Đang tải kho voucher của bạn...</div>
      ) : vouchers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-muted)' }}>Hiện chưa có mã voucher khả dụng.</p>
        </div>
      ) : (
        <div className="voucher-grid">
          {vouchers.map((v) => {
            const isPercent = String(v.loai_giamgia).toUpperCase() === 'PHAN_TRAM';
            const labelVal = isPercent
              ? `GIẢM ${v.gia_tri_giam}%`
              : `GIẢM ${formatCurrency(v.gia_tri_giam)}`;
            const isCopied = copiedCode === v.ma_voucher;

            return (
              <div className="voucher-ticket" key={v.id_khuyenmai}>
                <div className="voucher-left">
                  <span className="voucher-tag">VOUCHER</span>
                  <div className="voucher-value">{labelVal}</div>
                </div>
                <div className="voucher-right">
                  <div>
                    <div className="voucher-code">{v.ma_voucher}</div>
                    <div className="voucher-desc">
                      {isPercent
                        ? `Giảm ${v.gia_tri_giam}% tổng giá trị đơn đặt phòng & dịch vụ`
                        : `Trừ trực tiếp ${formatCurrency(v.gia_tri_giam)} vào tổng hóa đơn`}
                    </div>
                    <div className="voucher-exp">
                      Hiệu lực: {formatDate(v.ngay_batdau)} → {formatDate(v.ngay_ketthuc)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => handleUseNow(v.ma_voucher)}
                    >
                      <Sparkles size={13} /> Dùng ngay
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => handleCopy(v.ma_voucher)}
                    >
                      {isCopied ? (
                        <>
                          <Check size={13} /> Đã lưu
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Sao chép
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
