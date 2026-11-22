import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Info,
  Landmark,
  MapPin,
  Pencil,
  QrCode,
  ShieldCheck,
  Sparkles,
  Tag,
  Wallet,
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
];

const getRoomThumb = (roomTypeId, hotelId) =>
  roomTypeId
    ? GALLERY_POOL[Math.abs(Number(roomTypeId)) % GALLERY_POOL.length]
    : getHotelCover(hotelId || 1);

const formatDateShort = (isoStr) => {
  if (!isoStr) return '--/--/----';
  const clean = String(isoStr).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const PAYMENT_OPTIONS = [
  {
    id: 'MOMO',
    label: 'Ví điện tử MoMo',
    badgeText: 'MoMo',
    badgeBg: '#ae2070',
    promo: 'Thanh toán siêu tốc 1 chạm · Xác nhận giữ phòng ngay lập tức',
  },
  {
    id: 'VNPAY',
    label: 'Cổng thanh toán VNPAY-QR / ATM nội địa',
    badgeText: 'VNPAY',
    badgeBg: '#005baa',
    desc: 'Hỗ trợ quét mã QR ngân hàng & thẻ ATM hơn 40 ngân hàng Việt Nam',
  },
  {
    id: 'CHUYEN_KHOAN',
    label: 'Chuyển khoản ngân hàng (VietQR Sacombank)',
    badgeText: 'QR',
    badgeBg: '#0f766e',
    hasQr: true,
    desc: 'Quét mã QR chuyển khoản 24/7 trực tiếp đến tài khoản StayWithUs',
  },
  {
    id: 'TIEN_MAT',
    label: 'Thanh toán tại khách sạn',
    badgeText: 'Hotel',
    badgeBg: '#64748b',
    note: 'Khách sạn có thể hủy giữ phòng tùy tình trạng thực tế nếu nhận phòng trễ',
  },
  {
    id: 'THE_TIN_DUNG',
    label: 'Thẻ tín dụng / Ghi nợ quốc tế (Visa, Mastercard)',
    badgeText: 'Card',
    badgeBg: '#1e293b',
    desc: 'Bảo mật 3D-Secure chuẩn quốc tế PCI-DSS',
  },
];

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const defaults = getDefaultDates();

  const bookingIdParam = searchParams.get('bookingId');
  const hotelIdParam = searchParams.get('hotelId');
  const roomTypeIdParam = searchParams.get('roomTypeId');
  const isExistingBooking = Boolean(bookingIdParam);

  const checkIn = searchParams.get('checkIn') || defaults.checkIn;
  const checkOut = searchParams.get('checkOut') || defaults.checkOut;

  // Dữ liệu đặt mới (chỉ đọc theo lựa chọn từ trang khách sạn)
  const [hotel, setHotel] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [lockedRoomId, setLockedRoomId] = useState(null);
  const [activeVouchers, setActiveVouchers] = useState([]);

  // Dữ liệu đơn cũ cần thanh toán
  const [existingBooking, setExistingBooking] = useState(null);

  // Thông tin khách hàng (hiển thị & cho phép sửa tên khách lưu trú)
  const [guestName, setGuestName] = useState(user?.ho_ten || '');
  const [editingName, setEditingName] = useState(false);

  // Voucher
  const [showVoucherDrawer, setShowVoucherDrawer] = useState(false);
  const [voucherCode, setVoucherCode] = useState(
    () => sessionStorage.getItem('smartstay_copied_voucher') || ''
  );
  const [voucherPreview, setVoucherPreview] = useState(null);
  const [voucherError, setVoucherError] = useState('');

  // Dịch vụ thêm & Hóa đơn VAT
  const [showInvoiceDrawer, setShowInvoiceDrawer] = useState(false);
  const [needInvoice, setNeedInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    ten_cong_ty: '',
    ma_so_thue: '',
    email_nhan_hd: user?.email || '',
  });

  // Phương thức thanh toán
  const [payMethod, setPayMethod] = useState('MOMO');
  const [copiedText, setCopiedText] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setGuestName((prev) => prev || user.ho_ten || '');
      setInvoiceForm((prev) => ({
        ...prev,
        email_nhan_hd: prev.email_nhan_hd || user.email || '',
      }));
    }
  }, [user]);

  const nights = useMemo(() => {
    const startStr = isExistingBooking
      ? String(existingBooking?.ngay_nhan_phong || '').slice(0, 10)
      : checkIn;
    const endStr = isExistingBooking
      ? String(existingBooking?.ngay_tra_phong || '').slice(0, 10)
      : checkOut;
    if (!startStr || !endStr) return 1;
    const s = new Date(`${startStr}T00:00:00Z`);
    const e = new Date(`${endStr}T00:00:00Z`);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [isExistingBooking, existingBooking, checkIn, checkOut]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        if (isExistingBooking) {
          const res = await apiClient.get(`/bookings/${bookingIdParam}`);
          if (!active) return;
          setExistingBooking(res.data?.data || null);
        } else {
          if (!hotelIdParam || !roomTypeIdParam) {
            setError('Thiếu thông tin khách sạn hoặc loại phòng cần thanh toán.');
            setLoading(false);
            return;
          }
          const [hotelRes, roomsRes, vouchersRes] = await Promise.all([
            apiClient.get(`/hotels/${hotelIdParam}`, {
              params: { ngay_nhan_phong: checkIn, ngay_tra_phong: checkOut },
            }),
            apiClient.get(`/rooms/types/${roomTypeIdParam}/rooms`, {
              params: { ngay_nhan_phong: checkIn, ngay_tra_phong: checkOut },
            }),
            apiClient.get('/vouchers/active').catch(() => ({ data: { data: [] } })),
          ]);
          if (!active) return;
          const h = hotelRes.data?.data;
          const rooms = roomsRes.data?.data || [];
          const foundRt =
            (h?.loai_phong || []).find(
              (rt) => Number(rt.id_loaiphong) === Number(roomTypeIdParam)
            ) || (h?.loai_phong || [])[0];

          setHotel(h);
          setRoomType(foundRt || null);
          setLockedRoomId(rooms.length > 0 ? rooms[0].id_phong : null);

          const vList = (vouchersRes.data?.data || []).filter(
            (v) => !v.id_khachsan || Number(v.id_khachsan) === Number(hotelIdParam)
          );
          setActiveVouchers(vList);
        }
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [isExistingBooking, bookingIdParam, hotelIdParam, roomTypeIdParam, checkIn, checkOut]);

  // Tính giá cho đặt mới hoặc đơn cũ
  const pricing = useMemo(() => {
    if (isExistingBooking && existingBooking) {
      const roomTotal = (existingBooking.phong || []).reduce(
        (acc, p) => acc + Number(p.thanh_tien || 0),
        0
      );
      const serviceTotal = (existingBooking.dich_vu || []).reduce(
        (acc, d) => acc + Number(d.thanh_tien || 0),
        0
      );
      const rawSum = roomTotal + serviceTotal;
      const finalAmt = Number(existingBooking.tong_tien || 0);
      const discount = Math.max(0, rawSum - finalAmt);
      return {
        roomTotal,
        origRoomTotal: Math.round(roomTotal / 0.82),
        serviceTotal,
        discount,
        finalTotal: finalAmt,
      };
    }

    const roomTotal = roomType && lockedRoomId
      ? Number(roomType.gia_moi_dem || 0) * nights
      : 0;
    const origRoomTotal = Math.round(roomTotal / 0.82);
    const serviceTotal = 0;
    const subtotal = roomTotal;
    const discount = voucherPreview ? Number(voucherPreview.so_tien_giam || 0) : 0;
    const finalTotal = Math.max(0, subtotal - discount);

    return { roomTotal, origRoomTotal, serviceTotal, discount, finalTotal, subtotal };
  }, [
    isExistingBooking,
    existingBooking,
    roomType,
    lockedRoomId,
    nights,
    voucherPreview,
  ]);

  const handleApplyVoucher = async (codeOverride) => {
    const code = String(codeOverride ?? voucherCode).trim().toUpperCase();
    if (!code) return;
    setVoucherCode(code);
    setVoucherError('');
    try {
      const res = await apiClient.post('/vouchers/validate', {
        ma_voucher: code,
        tam_tinh: pricing.subtotal || pricing.roomTotal + pricing.serviceTotal,
        id_khachsan: Number(hotelIdParam),
      });
      setVoucherPreview(res.data?.data || null);
      setShowVoucherDrawer(false);
    } catch (err) {
      setVoucherPreview(null);
      setVoucherError(getErrorMessage(err));
    }
  };

  const handleCopy = (val) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(val).catch(() => {});
    }
    setCopiedText(val);
    setTimeout(() => setCopiedText(''), 1800);
  };

  const handleConfirmPayment = async () => {
    setError('');
    if (needInvoice) {
      if (!invoiceForm.ten_cong_ty.trim() || !invoiceForm.ma_so_thue.trim() || !invoiceForm.email_nhan_hd.trim()) {
        setShowInvoiceDrawer(true);
        setError('Vui lòng nhập đầy đủ Tên công ty, Mã số thuế và Email nhận hóa đơn VAT.');
        return;
      }
    }

    setSubmitting(true);
    try {
      let targetBookingId = Number(bookingIdParam);

      // 1. Nếu là đặt phòng mới từ trang Chi tiết -> tạo đơn theo đúng phòng & ngày đã chọn
      if (!isExistingBooking) {
        if (!lockedRoomId) {
          setError('Loại phòng này hiện đã hết phòng trống trong khoảng ngày bạn chọn.');
          setSubmitting(false);
          return;
        }

        const bookingRes = await apiClient.post('/bookings', {
          id_khachsan: Number(hotelIdParam),
          ngay_nhan_phong: checkIn,
          ngay_tra_phong: checkOut,
          phong_ids: [lockedRoomId],
          dich_vu: [],
          ma_voucher: voucherPreview?.voucher?.ma_voucher || null,
        });
        targetBookingId = bookingRes.data?.data?.id_dondat;
      }

      // 2. Khởi tạo giao dịch thanh toán
      const payRes = await apiClient.post('/payments', {
        id_dondat: targetBookingId,
        phuong_thuc: payMethod,
      });
      const paymentId = payRes.data?.data?.id_thanhtoan;

      // 3. Nếu thanh toán trực tuyến -> xác nhận DA_THANH_TOAN ngay (TIEN_MAT giữ CHO_THANH_TOAN tại quầy)
      let message = `Đặt phòng #${targetBookingId} thành công! Bạn sẽ thanh toán tiền mặt khi nhận phòng tại khách sạn.`;
      if (payMethod !== 'TIEN_MAT') {
        await apiClient.post(`/payments/${paymentId}/confirm`, {
          trang_thai_tt: 'DA_THANH_TOAN',
        });
        message = `Thanh toán thành công qua ${payMethod} cho đơn đặt phòng #${targetBookingId}!`;

        // 4. Xuất hóa đơn VAT tự động nếu khách có yêu cầu
        if (needInvoice && paymentId) {
          await apiClient.post(`/payments/${paymentId}/invoice`, {
            ten_cong_ty: invoiceForm.ten_cong_ty.trim(),
            ma_so_thue: invoiceForm.ma_so_thue.trim(),
            email_nhan_hd: invoiceForm.email_nhan_hd.trim(),
          });
          message += ' Hóa đơn VAT đã được xuất.';
        }
      }

      sessionStorage.removeItem('smartstay_copied_voucher');
      navigate('/my-bookings', { state: { paymentSuccess: message } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container section">
        <div className="card">Đang tải thông tin thanh toán...</div>
      </div>
    );
  }

  if (!isExistingBooking && (!hotel || !roomType)) {
    return (
      <div className="container section">
        <div className="alert alert-error">{error || 'Không tìm thấy thông tin phòng để thanh toán.'}</div>
        <Link to="/" className="btn btn-outline">
          <ArrowLeft size={16} /> Quay lại trang chủ
        </Link>
      </div>
    );
  }

  if (isExistingBooking && !existingBooking) {
    return (
      <div className="container section">
        <div className="alert alert-error">{error || 'Không tìm thấy đơn đặt phòng.'}</div>
        <Link to="/my-bookings" className="btn btn-outline">
          <ArrowLeft size={16} /> Quay lại đơn đặt phòng
        </Link>
      </div>
    );
  }

  const displayHotelName = isExistingBooking
    ? existingBooking.khach_san?.ten_khachsan
    : hotel.ten_khachsan;
  const displayHotelAddress = isExistingBooking
    ? existingBooking.khach_san?.dia_chi
    : `${hotel.dia_chi}, ${hotel.quan_huyen}, ${hotel.tinh_thanh}`;
  const displayRoomName = isExistingBooking
    ? (existingBooking.phong || []).map((p) => p.ten_loaiphong).filter(Boolean)[0] || 'Phòng đã đặt'
    : roomType.ten_loaiphong;
  const displayThumb = isExistingBooking
    ? getRoomThumb(existingBooking.phong?.[0]?.id_loaiphong, existingBooking.id_khachsan)
    : getRoomThumb(roomType.id_loaiphong, hotel.id_khachsan);
  const displayCheckIn = isExistingBooking
    ? formatDateShort(existingBooking.ngay_nhan_phong)
    : formatDateShort(checkIn);
  const displayCheckOut = isExistingBooking
    ? formatDateShort(existingBooking.ngay_tra_phong)
    : formatDateShort(checkOut);
  const transferNote = isExistingBooking
    ? `STAYWITHUS DON${existingBooking.id_dondat}`
    : `STAYWITHUS KS${hotel.id_khachsan}`;

  return (
    <div className="checkout-page-wrap">
      <div className="container" style={{ maxWidth: 1080 }}>
        {/* Thanh điều hướng quay lại */}
        <div className="co-top-nav">
          <button
            type="button"
            className="co-back-btn"
            onClick={() =>
              isExistingBooking
                ? navigate('/my-bookings')
                : navigate(`/hotels/${hotel.id_khachsan}?checkIn=${checkIn}&checkOut=${checkOut}`)
            }
          >
            <ArrowLeft size={17} />
            {isExistingBooking ? 'Quay lại Đơn đặt phòng của tôi' : 'Quay lại chi tiết khách sạn'}
          </button>
          <span className="co-secure-pill">
            <ShieldCheck size={15} /> Thanh toán an toàn · StayWithUs
          </span>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}

        {/* BỐ CỤC 2 CỘT CHUẨN ẢNH MẪU */}
        <div className="co-grid">
          {/* CỘT TRÁI: Lựa chọn của bạn + Thông tin người đặt + Voucher + Hóa đơn */}
          <div className="co-col">
            {/* 1. Lựa chọn của bạn (Your choice) */}
            <section className="co-card">
              <h2 className="co-card-title">Lựa chọn của bạn</h2>

              <div className="co-hotel-row">
                <img src={displayThumb} alt={displayRoomName} className="co-room-thumb" />
                <div className="co-hotel-meta">
                  <div className="co-meta-line">
                    <Building2 size={14} color="#64748b" />
                    <span>{displayHotelName}</span>
                  </div>
                  <div className="co-room-name">
                    <BedDouble size={15} color="#0f766e" style={{ flexShrink: 0 }} />
                    <span>{displayRoomName}</span>
                  </div>
                  <div className="co-meta-line co-address-truncate">
                    <MapPin size={14} color="#64748b" style={{ flexShrink: 0 }} />
                    <span>{displayHotelAddress}</span>
                  </div>
                </div>
              </div>

              {/* Hộp thời gian lưu trú cố định (chỉ đọc, không cho thay đổi trên trang thanh toán) */}
              <div className="co-time-box">
                <div className="co-duration-tile">
                  <Sparkles size={14} className="co-tile-sparkle" />
                  <Clock size={22} />
                  <strong>{String(nights).padStart(2, '0')} đêm</strong>
                </div>

                <div className="co-dates-panel">
                  <div className="co-date-row">
                    <div>
                      <div className="co-date-lbl">Nhận phòng</div>
                      <div className="co-date-val">14:00 &nbsp;•&nbsp; {displayCheckIn}</div>
                    </div>
                  </div>
                  <div className="co-date-row" style={{ marginTop: 10 }}>
                    <div>
                      <div className="co-date-lbl">Trả phòng</div>
                      <div className="co-date-val">12:00 &nbsp;•&nbsp; {displayCheckOut}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Thông tin người đặt (User information) */}
            <section className="co-card">
              <h2 className="co-card-title">Thông tin khách hàng</h2>
              <div className="co-info-rows">
                <div className="co-info-row">
                  <span className="co-info-lbl">Số điện thoại</span>
                  <span className="co-info-val">
                    {isExistingBooking
                      ? existingBooking.khach_hang?.sdt || user?.sdt || 'Chưa cập nhật'
                      : user?.sdt || 'Chưa cập nhật'}
                  </span>
                </div>
                <div className="co-info-row">
                  <span className="co-info-lbl">Họ và tên</span>
                  {editingName ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        className="input"
                        style={{ padding: '5px 10px', width: 180, fontSize: 13.5 }}
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ padding: '5px 10px' }}
                        onClick={() => setEditingName(false)}
                      >
                        Lưu
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="co-editable-name"
                      onClick={() => setEditingName(true)}
                      title="Chỉnh sửa tên người nhận phòng"
                    >
                      <Pencil size={13} color="#0f766e" />
                      <span>
                        {guestName ||
                          (isExistingBooking ? existingBooking.khach_hang?.ho_ten : user?.ho_ten)}
                      </span>
                    </button>
                  )}
                </div>
                <div className="co-info-row">
                  <span className="co-info-lbl">Email nhận xác nhận</span>
                  <span className="co-info-val" style={{ fontWeight: 500, color: '#475569' }}>
                    {isExistingBooking ? existingBooking.khach_hang?.email : user?.email}
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Mã ưu đãi (Coupon) */}
            <section className="co-card co-collapsible">
              <button
                type="button"
                className="co-collapse-head"
                onClick={() => !isExistingBooking && setShowVoucherDrawer((v) => !v)}
                disabled={isExistingBooking}
              >
                <span className="co-card-title" style={{ marginBottom: 0 }}>
                  Mã ưu đãi (Voucher)
                </span>
                <span className="co-action-accent">
                  {isExistingBooking ? (
                    existingBooking.khuyen_mai?.ma_voucher || 'Không áp dụng'
                  ) : voucherPreview ? (
                    <>
                      {voucherPreview.voucher?.ma_voucher} (-{formatCurrency(voucherPreview.so_tien_giam)})
                    </>
                  ) : (
                    <>
                      Chọn mã ưu đãi <ChevronRight size={16} />
                    </>
                  )}
                </span>
              </button>

              {!isExistingBooking && showVoucherDrawer && (
                <div className="co-collapse-body">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      placeholder="Nhập mã giảm giá (VD: WELCOME10)"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApplyVoucher()}
                    >
                      <Tag size={14} /> Áp dụng
                    </button>
                  </div>
                  {voucherError && (
                    <div style={{ color: '#dc2626', fontSize: 12.5, marginTop: 6 }}>{voucherError}</div>
                  )}
                  {voucherPreview && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                        fontSize: 13,
                        color: '#0f766e',
                      }}
                    >
                      <span>
                        <CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                        Đã áp dụng <strong>{voucherPreview.voucher?.ma_voucher}</strong>
                      </span>
                      <button
                        type="button"
                        className="co-link-btn"
                        onClick={() => {
                          setVoucherPreview(null);
                          setVoucherCode('');
                        }}
                      >
                        Gỡ mã
                      </button>
                    </div>
                  )}

                  {activeVouchers.length > 0 && (
                    <div className="co-voucher-list">
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                        Ưu đãi khả dụng cho đơn này:
                      </div>
                      {activeVouchers.slice(0, 5).map((v) => (
                        <button
                          key={v.id_khuyenmai}
                          type="button"
                          className="co-voucher-chip"
                          onClick={() => handleApplyVoucher(v.ma_voucher)}
                        >
                          <div>
                            <strong>{v.ma_voucher}</strong>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                              {v.loai_giamgia === 'PHAN_TRAM'
                                ? `Giảm ${v.gia_tri_giam}%`
                                : `Giảm ${formatCurrency(v.gia_tri_giam)}`}
                              {Number(v.don_toi_thieu) > 0
                                ? ` · Đơn từ ${formatCurrency(v.don_toi_thieu)}`
                                : ''}
                            </div>
                          </div>
                          <span style={{ color: '#0f766e', fontWeight: 700, fontSize: 12.5 }}>
                            Áp dụng
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 4. Yêu cầu xuất hóa đơn VAT (Service fee invoice request) */}
            <section className="co-card co-collapsible">
              <button
                type="button"
                className="co-collapse-head"
                onClick={() => setShowInvoiceDrawer((v) => !v)}
              >
                <span className="co-card-title" style={{ marginBottom: 0 }}>
                  Yêu cầu xuất hóa đơn VAT
                </span>
                <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {needInvoice && <span className="badge badge-success">Có VAT</span>}
                  {showInvoiceDrawer ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
              </button>

              {showInvoiceDrawer && (
                <div className="co-collapse-body">
                  <label className="co-vat-toggle">
                    <input
                      type="checkbox"
                      checked={needInvoice}
                      onChange={(e) => setNeedInvoice(e.target.checked)}
                    />
                    <FileText size={15} color="#0f766e" />
                    <span>Xuất hóa đơn điện tử VAT sau khi thanh toán</span>
                  </label>

                  {needInvoice && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                      <div className="field">
                        <label>Tên công ty / đơn vị</label>
                        <input
                          className="input"
                          value={invoiceForm.ten_cong_ty}
                          onChange={(e) =>
                            setInvoiceForm({ ...invoiceForm, ten_cong_ty: e.target.value })
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Mã số thuế</label>
                        <input
                          className="input"
                          value={invoiceForm.ma_so_thue}
                          onChange={(e) =>
                            setInvoiceForm({ ...invoiceForm, ma_so_thue: e.target.value })
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Email nhận hóa đơn</label>
                        <input
                          type="email"
                          className="input"
                          value={invoiceForm.email_nhan_hd}
                          onChange={(e) =>
                            setInvoiceForm({ ...invoiceForm, email_nhan_hd: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* CỘT PHẢI: Chi tiết thanh toán + Phương thức thanh toán + Chính sách & Nút Thanh toán */}
          <div className="co-col">
            {/* 1. Chi tiết thanh toán (Payment details) */}
            <section className="co-card">
              <h2 className="co-card-title">Chi tiết thanh toán</h2>
              <div className="co-price-rows">
                <div className="co-price-row">
                  <span className="co-price-lbl">
                    Giá phòng ({isExistingBooking ? existingBooking.phong?.length || 1 : 1} phòng × {nights} đêm)
                    <Info size={13} color="#0f766e" />
                  </span>
                  <div className="co-price-right">
                    {pricing.origRoomTotal > pricing.roomTotal && (
                      <span className="co-price-strike">{formatCurrency(pricing.origRoomTotal)}</span>
                    )}
                    <strong>{formatCurrency(pricing.roomTotal)}</strong>
                  </div>
                </div>

                {pricing.serviceTotal > 0 && (
                  <div className="co-price-row">
                    <span className="co-price-lbl" style={{ color: '#0f766e' }}>
                      Dịch vụ đi kèm <Info size={13} color="#0f766e" />
                    </span>
                    <strong>+{formatCurrency(pricing.serviceTotal)}</strong>
                  </div>
                )}

                {pricing.discount > 0 && (
                  <div className="co-price-row">
                    <span className="co-price-lbl" style={{ color: '#16a34a' }}>
                      Giảm giá ưu đãi
                    </span>
                    <strong style={{ color: '#16a34a' }}>-{formatCurrency(pricing.discount)}</strong>
                  </div>
                )}

                <div className="co-price-divider" />

                <div className="co-price-total-row">
                  <span>Tổng thanh toán</span>
                  <strong>{formatCurrency(pricing.finalTotal)}</strong>
                </div>
              </div>
            </section>

            {/* 2. Chọn phương thức thanh toán (Choose payment method) */}
            <section className="co-card">
              <h2 className="co-card-title">Chọn phương thức thanh toán</h2>

              <div className="co-pay-list">
                {PAYMENT_OPTIONS.map((opt) => {
                  const selected = payMethod === opt.id;
                  return (
                    <div key={opt.id} className={`co-pay-item ${selected ? 'selected' : ''}`}>
                      <label className="co-pay-radio-row">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={opt.id}
                          checked={selected}
                          onChange={() => setPayMethod(opt.id)}
                        />
                        <span className="co-radio-circle" />
                        <span
                          className="co-pay-icon-badge"
                          style={{ background: opt.badgeBg }}
                        >
                          {opt.id === 'CHUYEN_KHOAN' ? (
                            <QrCode size={13} />
                          ) : opt.id === 'TIEN_MAT' ? (
                            <Landmark size={13} />
                          ) : opt.id === 'THE_TIN_DUNG' ? (
                            <CreditCard size={13} />
                          ) : (
                            <Wallet size={13} />
                          )}
                        </span>
                        <span className="co-pay-label">{opt.label}</span>
                      </label>

                      {opt.promo && (
                        <div className="co-pay-promo-box">{opt.promo}</div>
                      )}
                      {opt.desc && <div className="co-pay-sub-text">{opt.desc}</div>}
                      {opt.note && (
                        <div className="co-pay-note-line">
                          <Info size={13} /> {opt.note}
                        </div>
                      )}

                      {/* Hiển thị ô vuông Mã QR VietQR gọn gàng khi chọn Chuyển khoản / VNPAY / MoMo */}
                      {selected && ['CHUYEN_KHOAN', 'VNPAY', 'MOMO'].includes(opt.id) && (
                        <div className="co-inline-qr">
                          <img
                            src="/payment-qr.png"
                            alt="Mã QR thanh toán StayWithUs"
                            className="co-inline-qr-img"
                          />
                          <div className="co-inline-qr-info">
                            <div className="co-qr-bank">Sacombank · Napas 247 / VietQR</div>
                            <div>
                              Chủ TK: <strong>TRAN HOA NAM</strong>
                            </div>
                            <div className="co-qr-copy-row">
                              <span>
                                STK: <code>060259439178</code>
                              </span>
                              <button
                                type="button"
                                className="co-copy-mini"
                                onClick={() => handleCopy('060259439178')}
                              >
                                {copiedText === '060259439178' ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                            <div className="co-qr-copy-row">
                              <span>
                                Nội dung: <code>{transferNote}</code>
                              </span>
                              <button
                                type="button"
                                className="co-copy-mini"
                                onClick={() => handleCopy(transferNote)}
                              >
                                {copiedText === transferNote ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                            <div style={{ fontSize: 12, color: '#0f766e', fontWeight: 700, marginTop: 2 }}>
                              Số tiền: {formatCurrency(pricing.finalTotal)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Thanh hành động cuối: Chính sách hủy phòng + Nút Thanh toán */}
            <div className="co-bottom-bar">
              <button
                type="button"
                className="co-policy-link"
                onClick={() => setShowPolicyModal(true)}
              >
                Chính sách hủy phòng
              </button>

              <button
                type="button"
                className="btn btn-primary co-pay-submit-btn"
                disabled={submitting || (!isExistingBooking && !lockedRoomId)}
                onClick={handleConfirmPayment}
              >
                {submitting
                  ? 'Đang xử lý...'
                  : payMethod === 'TIEN_MAT'
                  ? 'Xác nhận đặt phòng'
                  : 'Thanh toán'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Chính sách hủy phòng */}
      {showPolicyModal && (
        <div className="modal-backdrop" onClick={() => setShowPolicyModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
              Chính sách hủy phòng · StayWithUs
            </h3>
            <ul style={{ paddingLeft: 18, fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
              <li>Hủy miễn phí khi đơn đang ở trạng thái <strong>Chờ xác nhận</strong> hoặc trước giờ nhận phòng.</li>
              <li>Sau khi đã nhận phòng (Check-in), không hỗ trợ hủy đơn trực tuyến.</li>
              <li>Mọi thắc mắc về hoàn tiền vui lòng liên hệ: <strong>hoanamtran68@gmail.com</strong>.</li>
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowPolicyModal(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
