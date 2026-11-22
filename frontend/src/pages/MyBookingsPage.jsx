import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, FileText, Star, XCircle } from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate, getStatusBadge } from '../utils/format';

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(() => location.state?.paymentSuccess || '');

  // Modal hóa đơn VAT
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    ma_so_thue: '',
    ten_cong_ty: '',
    email_nhan_hd: '',
  });

  // Modal đánh giá (chỉ mở cho đơn đã hoàn thành hoặc hết thời gian lưu trú)
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ so_sao: 5, noi_dung: '' });

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/bookings/my-bookings?limit=30');
      setBookings(res.data?.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm(`Xác nhận hủy đơn đặt phòng #${bookingId}?`)) return;
    setError('');
    setSuccess('');
    try {
      await apiClient.patch(`/bookings/${bookingId}/cancel`);
      setSuccess(`Đã hủy đơn đặt phòng #${bookingId}.`);
      loadBookings();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openInvoiceModal = async (booking) => {
    setError('');
    try {
      const res = await apiClient.get(`/payments/booking/${booking.id_dondat}`);
      const paid = (res.data?.data || []).find((p) => p.trang_thai_tt === 'DA_THANH_TOAN');
      if (!paid) {
        setError('Đơn đặt phòng chưa có giao dịch thanh toán hoàn tất.');
        return;
      }
      if (paid.hoa_don) {
        setSuccess(
          `Đơn #${booking.id_dondat} đã xuất hóa đơn VAT #${paid.hoa_don.id_hoadon} (${paid.hoa_don.ten_cong_ty} - MST: ${paid.hoa_don.ma_so_thue}).`
        );
        return;
      }
      setInvoiceModal({ bookingId: booking.id_dondat, paymentId: paid.id_thanhtoan });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleIssueInvoice = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post(`/payments/${invoiceModal.paymentId}/invoice`, invoiceForm);
      setInvoiceModal(null);
      setInvoiceForm({ ma_so_thue: '', ten_cong_ty: '', email_nhan_hd: '' });
      setSuccess(`Đã xuất hóa đơn VAT #${res.data?.data?.id_hoadon} thành công!`);
      loadBookings();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/reviews', {
        id_khachsan: reviewModal.id_khachsan,
        so_sao: Number(reviewForm.so_sao),
        noi_dung: reviewForm.noi_dung.trim(),
      });
      setReviewModal(null);
      setReviewForm({ so_sao: 5, noi_dung: '' });
      setSuccess(`Cảm ơn bạn đã gửi đánh giá cho "${reviewModal.ten_khachsan}"!`);
      loadBookings();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Đơn đặt phòng của tôi</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Quản lý lịch lưu trú, thanh toán mã QR trực tuyến và xuất hóa đơn điện tử VAT.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card table-wrap">
        {loading ? (
          <p>Đang tải danh sách đơn...</p>
        ) : bookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Bạn chưa có đơn đặt phòng nào.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách sạn</th>
                <th>Thời gian</th>
                <th>Tổng tiền</th>
                <th>Trạng thái đơn</th>
                <th>Thanh toán</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const st = getStatusBadge(b.trang_thai_don);
                const pst = getStatusBadge(b.trang_thai_thanh_toan);
                const canPay =
                  ['CHO_XAC_NHAN', 'DA_XAC_NHAN'].includes(b.trang_thai_don) &&
                  b.trang_thai_thanh_toan !== 'DA_THANH_TOAN';
                const canCancel = ['CHO_XAC_NHAN', 'DA_XAC_NHAN'].includes(b.trang_thai_don);
                const isPaid = b.trang_thai_thanh_toan === 'DA_THANH_TOAN';

                return (
                  <tr key={b.id_dondat}>
                    <td>
                      <strong>#{b.id_dondat}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{b.ten_khachsan}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.so_phong} phòng</div>
                    </td>
                    <td>
                      {formatDate(b.ngay_nhan_phong)} → {formatDate(b.ngay_tra_phong)}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {formatCurrency(b.tong_tien)}
                    </td>
                    <td>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td>
                      <span className={`badge ${pst.cls}`}>{pst.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {canPay && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/checkout?bookingId=${b.id_dondat}`)}
                          >
                            <CreditCard size={14} /> Thanh toán
                          </button>
                        )}
                        {isPaid && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openInvoiceModal(b)}
                          >
                            <FileText size={14} /> Hóa đơn VAT
                          </button>
                        )}
                        {b.co_the_danh_gia && !b.da_danh_gia && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: '#f59e0b', color: '#b45309', background: '#fffbeb' }}
                            onClick={() => {
                              setReviewForm({ so_sao: 5, noi_dung: '' });
                              setReviewModal(b);
                            }}
                          >
                            <Star size={14} fill="#f59e0b" color="#f59e0b" /> Đánh giá
                          </button>
                        )}
                        {b.da_danh_gia && (
                          <span className="badge badge-success">✓ Đã đánh giá</span>
                        )}
                        {canCancel && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancel(b.id_dondat)}
                          >
                            <XCircle size={14} /> Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Xuất Hóa đơn VAT */}
      {invoiceModal && (
        <div className="modal-backdrop" onClick={() => setInvoiceModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>
              Xuất hóa đơn VAT (Đơn #{invoiceModal.bookingId})
            </h2>
            <form
              onSubmit={handleIssueInvoice}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div className="field">
                <label>Tên công ty / Đơn vị</label>
                <input
                  className="input"
                  required
                  value={invoiceForm.ten_cong_ty}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, ten_cong_ty: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mã số thuế</label>
                <input
                  className="input"
                  required
                  value={invoiceForm.ma_so_thue}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, ma_so_thue: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Email nhận hóa đơn điện tử</label>
                <input
                  type="email"
                  className="input"
                  required
                  value={invoiceForm.email_nhan_hd}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, email_nhan_hd: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" className="btn btn-outline" onClick={() => setInvoiceModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Xuất hóa đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đánh giá khách sạn sau khi hoàn thành / hết hạn lưu trú */}
      {reviewModal && (
        <div className="modal-backdrop" onClick={() => setReviewModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
              Đánh giá trải nghiệm lưu trú
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 14 }}>
              Đơn #{reviewModal.id_dondat} · <strong>{reviewModal.ten_khachsan}</strong>
            </p>
            <form
              onSubmit={handleSubmitReview}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div className="field">
                <label>Mức độ hài lòng (1 - 5 sao)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`btn btn-sm ${reviewForm.so_sao >= s ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setReviewForm({ ...reviewForm, so_sao: s })}
                    >
                      {s} ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Nhận xét của bạn</label>
                <textarea
                  rows={3}
                  className="textarea"
                  required
                  placeholder="Phòng sạch sẽ, nhân viên nhiệt tình, vị trí thuận tiện..."
                  value={reviewForm.noi_dung}
                  onChange={(e) => setReviewForm({ ...reviewForm, noi_dung: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setReviewModal(null)}>
                  Đóng
                </button>
                <button type="submit" className="btn btn-primary">
                  Gửi đánh giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
