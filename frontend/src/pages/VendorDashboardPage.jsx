import { useEffect, useState } from 'react';
import {
  BarChart3,
  BedDouble,
  Building2,
  CalendarCheck,
  ConciergeBell,
  Edit3,
  Eye,
  MessageSquare,
  Plus,
  Sparkles,
  Ticket,
  Trash2,
} from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate, getStatusBadge } from '../utils/format';

const ROOM_STATUS_OPTIONS = [
  { value: 'TRONG', label: 'Trống', cls: 'room-st-free' },
  { value: 'DANG_SU_DUNG', label: 'Đang sử dụng', cls: 'room-st-busy' },
  { value: 'BAO_TRI', label: 'Bảo trì', cls: 'room-st-maint' },
  { value: 'TAM_NGUNG', label: 'Tạm ngưng', cls: 'room-st-off' },
];

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { id: 'bookings', label: 'Đơn đặt phòng', icon: CalendarCheck },
  { id: 'hotels', label: 'Khách sạn', icon: Building2 },
  { id: 'rooms', label: 'Phòng & Tình trạng', icon: BedDouble },
  { id: 'services', label: 'Dịch vụ', icon: ConciergeBell },
  { id: 'vouchers', label: 'Voucher khách sạn', icon: Ticket },
  { id: 'reviews', label: 'Đánh giá & Hồ sơ', icon: MessageSquare },
];

export default function VendorDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dữ liệu cốt lõi của NCC
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [amenities, setAmenities] = useState([]);

  // Khách sạn đang chọn để quản lý Phòng / Dịch vụ / Đánh giá
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [roomTypes, setRoomTypes] = useState([]);
  const [roomsByType, setRoomsByType] = useState({});
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});

  // Bộ lọc đơn hàng & Modal chi tiết đơn
  const [bookingFilterHotel, setBookingFilterHotel] = useState('');
  const [bookingFilterStatus, setBookingFilterStatus] = useState('');
  const [bookingDetailModal, setBookingDetailModal] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Thêm / Sửa Khách sạn
  const [hotelModal, setHotelModal] = useState(null); // null | { mode: 'create'|'edit', id? }
  const [hotelForm, setHotelForm] = useState({
    ten_khachsan: '',
    id_diadiem: '',
    dia_chi: '',
    hang_sao: 4,
    mo_ta: '',
    tien_ich_ids: [],
  });

  // Modal Loại phòng & Thêm phòng
  const [rtModal, setRtModal] = useState(null);
  const [rtForm, setRtForm] = useState({
    ten_loaiphong: '',
    suc_chua: 2,
    gia_moi_dem: 1000000,
    dien_tich: 30,
    mo_ta_lp: '',
  });
  const [addRoomModal, setAddRoomModal] = useState(null); // { id_loaiphong, ten_loaiphong }
  const [addRoomForm, setAddRoomForm] = useState({ so_phong_list: '', tang: 1, ghi_chu: '' });

  // Modal Dịch vụ
  const [svcModal, setSvcModal] = useState(null);
  const [svcForm, setSvcForm] = useState({ ten_dichvu: '', gia_dichvu: 200000, don_vi_tinh: 'Lượt' });

  // Modal Voucher của khách sạn
  const [voucherModal, setVoucherModal] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    id_khachsan: '',
    ma_voucher: '',
    loai_giamgia: 'PHAN_TRAM',
    gia_tri_giam: 10,
    ngay_batdau: new Date().toISOString().slice(0, 10),
    ngay_ketthuc: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  // Form hồ sơ NCC
  const [profileForm, setProfileForm] = useState({
    ten_doanh_nghiep: '',
    ma_so_thue: '',
    so_tai_khoan: '',
  });

  const notify = (msg) => {
    setError('');
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const loadCoreData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ovRes, revRes, profRes, hRes, bRes, vRes, locRes, amenRes] = await Promise.all([
        apiClient.get('/reports/vendor/overview').catch(() => ({ data: { data: null } })),
        apiClient.get('/reports/vendor/revenue?year=2026').catch(() => ({ data: { data: null } })),
        apiClient.get('/vendors/me').catch(() => ({ data: { data: null } })),
        apiClient.get('/hotels/vendor/my-hotels').catch(() => ({ data: { data: [] } })),
        apiClient.get('/bookings/vendor/list').catch(() => ({ data: { data: [] } })),
        apiClient.get('/vouchers/vendor/my-vouchers').catch(() => ({ data: { data: [] } })),
        apiClient.get('/categories/locations').catch(() => ({ data: { data: [] } })),
        apiClient.get('/categories/amenities').catch(() => ({ data: { data: [] } })),
      ]);

      setOverview(ovRes.data?.data);
      setRevenue(revRes.data?.data);
      const prof = profRes.data?.data;
      setVendorProfile(prof);
      if (prof) {
        setProfileForm({
          ten_doanh_nghiep: prof.ten_doanh_nghiep || '',
          ma_so_thue: prof.ma_so_thue || '',
          so_tai_khoan: prof.so_tai_khoan || '',
        });
      }

      const myHotels = hRes.data?.data || [];
      setHotels(myHotels);
      setBookings(bRes.data?.data || []);
      setVouchers(vRes.data?.data || []);
      setLocations(locRes.data?.data || []);
      setAmenities(amenRes.data?.data || []);

      if (myHotels.length > 0 && !selectedHotelId) {
        setSelectedHotelId(String(myHotels[0].id_khachsan));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadHotelSubResources = async (hotelId) => {
    if (!hotelId) return;
    try {
      const [rtRes, svcRes, revRes] = await Promise.all([
        apiClient.get(`/hotels/${hotelId}/room-types`),
        apiClient.get(`/hotels/${hotelId}/services`),
        apiClient.get(`/reviews/hotel/${hotelId}?limit=50`),
      ]);

      const rts = rtRes.data?.data || [];
      setRoomTypes(rts);
      setServices(svcRes.data?.data || []);
      const rvList = revRes.data?.data || [];
      setReviews(rvList);
      setReplyDrafts(
        Object.fromEntries(rvList.map((r) => [r.id_danhgia, r.phan_hoi_ncc || '']))
      );

      // Tải danh sách phòng vật lý từng loại phòng
      if (rts.length > 0) {
        const pairs = await Promise.all(
          rts.map(async (rt) => {
            const r = await apiClient.get(`/rooms/types/${rt.id_loaiphong}/rooms`);
            return [rt.id_loaiphong, r.data?.data || []];
          })
        );
        setRoomsByType(Object.fromEntries(pairs));
      } else {
        setRoomsByType({});
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadCoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedHotelId) {
      loadHotelSubResources(selectedHotelId);
    }
  }, [selectedHotelId]);

  // ============================================
  // XỬ LÝ ĐƠN HÀNG & CHI TIẾT ĐƠN
  // ============================================
  const openBookingDetail = async (bookingId) => {
    setLoadingDetail(true);
    setError('');
    try {
      const res = await apiClient.get(`/bookings/${bookingId}`);
      setBookingDetailModal(res.data?.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleBookingStatusChange = async (bookingId, nextStatus) => {
    setError('');
    try {
      await apiClient.patch(`/bookings/${bookingId}/status`, { trang_thai_don: nextStatus });
      notify(`Đã chuyển đơn #${bookingId} sang trạng thái ${nextStatus}.`);
      await loadCoreData();
      if (selectedHotelId) await loadHotelSubResources(selectedHotelId);
      if (bookingDetailModal?.id_dondat === bookingId) {
        await openBookingDetail(bookingId);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleConfirmPayment = async (paymentId, status) => {
    setError('');
    try {
      await apiClient.post(`/payments/${paymentId}/confirm`, { trang_thai_tt: status });
      notify(`Đã cập nhật trạng thái thanh toán thành ${status}.`);
      await loadCoreData();
      if (bookingDetailModal) await openBookingDetail(bookingDetailModal.id_dondat);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // ============================================
  // XỬ LÝ KHÁCH SẠN & TIỆN ÍCH
  // ============================================
  const openCreateHotel = () => {
    setHotelForm({
      ten_khachsan: '',
      id_diadiem: locations[0]?.id_diadiem || '',
      dia_chi: '',
      hang_sao: 4,
      mo_ta: '',
      tien_ich_ids: [],
    });
    setHotelModal({ mode: 'create' });
  };

  const openEditHotel = async (hotelId) => {
    setError('');
    try {
      const res = await apiClient.get(`/hotels/${hotelId}`);
      const h = res.data?.data;
      setHotelForm({
        ten_khachsan: h.ten_khachsan || '',
        id_diadiem: h.id_diadiem || '',
        dia_chi: h.dia_chi || '',
        hang_sao: h.hang_sao || 4,
        mo_ta: h.mo_ta || '',
        tien_ich_ids: (h.tien_ich || []).map((t) => Number(t.id_tienich)),
      });
      setHotelModal({ mode: 'edit', id: hotelId });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggleAmenity = (id) => {
    setHotelForm((prev) => ({
      ...prev,
      tien_ich_ids: prev.tien_ich_ids.includes(id)
        ? prev.tien_ich_ids.filter((x) => x !== id)
        : [...prev.tien_ich_ids, id],
    }));
  };

  const handleSaveHotel = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...hotelForm,
        id_diadiem: Number(hotelForm.id_diadiem),
        hang_sao: Number(hotelForm.hang_sao),
      };
      if (hotelModal.mode === 'create') {
        await apiClient.post('/hotels', payload);
        notify('Tạo khách sạn mới thành công!');
      } else {
        await apiClient.put(`/hotels/${hotelModal.id}`, payload);
        notify('Cập nhật thông tin khách sạn & tiện ích thành công!');
      }
      setHotelModal(null);
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteHotel = async (hotelId, name) => {
    if (!window.confirm(`Xác nhận xóa khách sạn "${name}"?`)) return;
    setError('');
    try {
      await apiClient.delete(`/hotels/${hotelId}`);
      notify(`Đã xóa khách sạn "${name}".`);
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSyncHotelAi = async (hotelId) => {
    setError('');
    try {
      const res = await apiClient.post(`/ai/embeddings/hotel/${hotelId}`);
      notify(res.data?.message || 'Đã đồng bộ Vector AI cho khách sạn!');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // ============================================
  // XỬ LÝ LOẠI PHÒNG & PHÒNG VẬT LÝ
  // ============================================
  const openCreateRoomType = () => {
    setRtForm({ ten_loaiphong: '', suc_chua: 2, gia_moi_dem: 1000000, dien_tich: 30, mo_ta_lp: '' });
    setRtModal({ mode: 'create' });
  };

  const openEditRoomType = (rt) => {
    setRtForm({
      ten_loaiphong: rt.ten_loaiphong,
      suc_chua: rt.suc_chua,
      gia_moi_dem: rt.gia_moi_dem,
      dien_tich: rt.dien_tich || '',
      mo_ta_lp: rt.mo_ta_lp || '',
    });
    setRtModal({ mode: 'edit', id: rt.id_loaiphong });
  };

  const handleSaveRoomType = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...rtForm,
        suc_chua: Number(rtForm.suc_chua),
        gia_moi_dem: Number(rtForm.gia_moi_dem),
        dien_tich: rtForm.dien_tich ? Number(rtForm.dien_tich) : null,
      };
      if (rtModal.mode === 'create') {
        await apiClient.post(`/hotels/${selectedHotelId}/room-types`, payload);
        notify('Thêm loại phòng thành công!');
      } else {
        await apiClient.put(`/rooms/types/${rtModal.id}`, payload);
        notify('Cập nhật loại phòng thành công!');
      }
      setRtModal(null);
      await loadHotelSubResources(selectedHotelId);
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteRoomType = async (rtId) => {
    if (!window.confirm('Xác nhận xóa loại phòng này?')) return;
    setError('');
    try {
      await apiClient.delete(`/rooms/types/${rtId}`);
      notify('Đã xóa loại phòng.');
      await loadHotelSubResources(selectedHotelId);
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleCreateRooms = async (e) => {
    e.preventDefault();
    if (!addRoomModal) return;
    setError('');
    const roomNumbers = addRoomForm.so_phong_list
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (roomNumbers.length === 0) {
      setError('Vui lòng nhập ít nhất 1 số phòng (VD: 401, 402, 403).');
      return;
    }
    try {
      await apiClient.post(`/rooms/types/${addRoomModal.id_loaiphong}/rooms`, {
        rooms: roomNumbers.map((so_phong) => ({
          so_phong,
          tang: addRoomForm.tang ? Number(addRoomForm.tang) : null,
          ghi_chu: addRoomForm.ghi_chu || null,
        })),
      });
      setAddRoomModal(null);
      setAddRoomForm({ so_phong_list: '', tang: 1, ghi_chu: '' });
      notify(`Đã thêm ${roomNumbers.length} phòng mới!`);
      await loadHotelSubResources(selectedHotelId);
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRoomStatusChange = async (roomId, nextStatus) => {
    setError('');
    try {
      await apiClient.patch(`/rooms/${roomId}/status`, { trang_thai_phong: nextStatus });
      notify(`Đã đổi tình trạng phòng #${roomId} sang ${nextStatus}.`);
      await loadHotelSubResources(selectedHotelId);
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteRoom = async (roomId, roomNo) => {
    if (!window.confirm(`Xóa phòng ${roomNo}?`)) return;
    setError('');
    try {
      await apiClient.delete(`/rooms/${roomId}`);
      notify(`Đã xóa phòng ${roomNo}.`);
      await loadHotelSubResources(selectedHotelId);
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // ============================================
  // XỬ LÝ DỊCH VỤ KHÁCH SẠN
  // ============================================
  const handleSaveService = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ten_dichvu: svcForm.ten_dichvu,
        gia_dichvu: Number(svcForm.gia_dichvu),
        don_vi_tinh: svcForm.don_vi_tinh,
      };
      if (svcModal.mode === 'create') {
        await apiClient.post(`/hotels/${selectedHotelId}/services`, payload);
        notify('Thêm dịch vụ thành công!');
      } else {
        await apiClient.put(`/rooms/services/${svcModal.id}`, payload);
        notify('Cập nhật dịch vụ thành công!');
      }
      setSvcModal(null);
      await loadHotelSubResources(selectedHotelId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteService = async (svcId) => {
    if (!window.confirm('Xác nhận xóa dịch vụ này?')) return;
    setError('');
    try {
      await apiClient.delete(`/rooms/services/${svcId}`);
      notify('Đã xóa dịch vụ.');
      await loadHotelSubResources(selectedHotelId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // ============================================
  // XỬ LÝ VOUCHER CỦA KHÁCH SẠN
  // ============================================
  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/vouchers', {
        id_khachsan: Number(voucherForm.id_khachsan || selectedHotelId),
        ma_voucher: voucherForm.ma_voucher.trim().toUpperCase(),
        loai_giamgia: voucherForm.loai_giamgia,
        gia_tri_giam: Number(voucherForm.gia_tri_giam),
        ngay_batdau: `${voucherForm.ngay_batdau}T00:00:00Z`,
        ngay_ketthuc: `${voucherForm.ngay_ketthuc}T23:59:59Z`,
      });
      setVoucherModal(false);
      setVoucherForm((prev) => ({ ...prev, ma_voucher: '' }));
      notify('Tạo mã voucher cho khách sạn thành công!');
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteVoucher = async (voucherId, code) => {
    if (!window.confirm(`Xóa mã voucher "${code}"?`)) return;
    setError('');
    try {
      await apiClient.delete(`/vouchers/${voucherId}`);
      notify(`Đã xóa mã voucher "${code}".`);
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // ============================================
  // PHẢN HỒI ĐÁNH GIÁ & HỒ SƠ NCC
  // ============================================
  const handleReplyReview = async (reviewId) => {
    const text = String(replyDrafts[reviewId] || '').trim();
    if (!text) return;
    setError('');
    try {
      await apiClient.patch(`/reviews/${reviewId}/reply`, { phan_hoi_ncc: text });
      notify('Đã gửi phản hồi đánh giá của khách hàng!');
      await loadHotelSubResources(selectedHotelId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.put('/vendors/me', profileForm);
      notify('Cập nhật hồ sơ nhà cung cấp thành công!');
      await loadCoreData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchHotel = !bookingFilterHotel || Number(b.id_khachsan) === Number(bookingFilterHotel);
    const matchStatus = !bookingFilterStatus || b.trang_thai_don === bookingFilterStatus;
    return matchHotel && matchStatus;
  });

  const maxMonthly = Math.max(1, ...(revenue?.theo_thang || []).map((m) => m.doanh_thu));

  const renderHotelSelector = () => (
    <div className="vendor-hotel-picker">
      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
        Đang quản lý khách sạn:
      </label>
      <select
        className="select"
        style={{ maxWidth: 360 }}
        value={selectedHotelId}
        onChange={(e) => setSelectedHotelId(e.target.value)}
      >
        {hotels.map((h) => (
          <option key={h.id_khachsan} value={h.id_khachsan}>
            #{h.id_khachsan} — {h.ten_khachsan} ({h.tinh_thanh})
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="container section">
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="section-title">Kênh Quản lý Nhà cung cấp (Vendor Portal)</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {vendorProfile
              ? `${vendorProfile.ten_doanh_nghiep} · Chiết khấu sàn ${vendorProfile.ty_le_chiet_khau}%`
              : 'Quản lý toàn diện khách sạn, tình trạng phòng, đơn đặt phòng, dịch vụ, voucher & đánh giá.'}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreateHotel}>
          <Plus size={16} /> Thêm khách sạn
        </button>
      </div>

      {/* Thanh Tabs quản trị 7 phân hệ */}
      <div className="vendor-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`vendor-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              {t.id === 'bookings' && bookings.length > 0 && (
                <span className="vendor-tab-count">{bookings.length}</span>
              )}
              {t.id === 'vouchers' && vouchers.length > 0 && (
                <span className="vendor-tab-count">{vouchers.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="card">Đang tải dữ liệu nhà cung cấp...</div>
      ) : (
        <>
          {/* TAB 1: TỔNG QUAN & DOANH THU */}
          {activeTab === 'overview' && (
            <>
              {overview && (
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-label">Khách sạn đang vận hành</div>
                    <div className="kpi-value">{overview.khach_san.tong_khach_san}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      Đã duyệt: {overview.khach_san.da_duyet} · Chờ duyệt: {overview.khach_san.cho_duyet}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Tình trạng phòng toàn hệ thống</div>
                    <div className="kpi-value">{overview.phong.tong_so_phong} phòng</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      Trống: {overview.phong.phong_trong} · Đang dùng: {overview.phong.dang_su_dung} · Bảo trì:{' '}
                      {overview.phong.bao_tri}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Doanh thu thực nhận</div>
                    <div className="kpi-value" style={{ color: 'var(--primary)' }}>
                      {formatCurrency(overview.don_dat_phong.doanh_thu_thuc_nhan)}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      Tổng: {formatCurrency(overview.don_dat_phong.tong_doanh_thu)} · Hoa hồng:{' '}
                      {formatCurrency(overview.don_dat_phong.tong_hoa_hong)}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Đánh giá trung bình</div>
                    <div className="kpi-value">{overview.danh_gia.diem_trung_binh} ★</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      Tổng {overview.danh_gia.tong_danh_gia} lượt đánh giá
                    </div>
                  </div>
                </div>
              )}

              {revenue && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                    Biểu đồ doanh thu 12 tháng (Năm {revenue.nam})
                  </h2>
                  <div className="bar-chart">
                    {revenue.theo_thang.map((m) => (
                      <div
                        className="bar-col"
                        key={m.thang}
                        title={`Tháng ${m.thang}: Doanh thu ${formatCurrency(m.doanh_thu)} | Thực nhận ${formatCurrency(m.thuc_nhan_ncc)}`}
                      >
                        <div
                          className="bar-fill"
                          style={{ height: `${Math.max(4, Math.round((m.doanh_thu / maxMonthly) * 145))}px` }}
                        />
                        <span className="bar-label">T{m.thang}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {revenue?.theo_khach_san?.length > 0 && (
                <div className="card table-wrap">
                  <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
                    Hiệu quả doanh thu theo từng khách sạn
                  </h2>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Khách sạn</th>
                        <th>Số đơn</th>
                        <th>Tổng doanh thu</th>
                        <th>Phí hoa hồng sàn</th>
                        <th>Thực nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.theo_khach_san.map((item) => (
                        <tr key={item.id_khachsan}>
                          <td>
                            <strong>{item.ten_khachsan}</strong>
                          </td>
                          <td>{item.so_don}</td>
                          <td>{formatCurrency(item.doanh_thu)}</td>
                          <td style={{ color: '#b45309' }}>{formatCurrency(item.phi_hoa_hong)}</td>
                          <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                            {formatCurrency(item.thuc_nhan)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB 2: QUẢN LÝ ĐƠN ĐẶT PHÒNG & XEM CHI TIẾT */}
          {activeTab === 'bookings' && (
            <div className="card">
              <div className="section-header" style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                  Quản lý đơn đặt phòng ({filteredBookings.length})
                </h2>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <select
                    className="select"
                    style={{ width: 220 }}
                    value={bookingFilterHotel}
                    onChange={(e) => setBookingFilterHotel(e.target.value)}
                  >
                    <option value="">Tất cả khách sạn</option>
                    {hotels.map((h) => (
                      <option key={h.id_khachsan} value={h.id_khachsan}>
                        {h.ten_khachsan}
                      </option>
                    ))}
                  </select>
                  <select
                    className="select"
                    style={{ width: 180 }}
                    value={bookingFilterStatus}
                    onChange={(e) => setBookingFilterStatus(e.target.value)}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="CHO_XAC_NHAN">Chờ xác nhận</option>
                    <option value="DA_XAC_NHAN">Đã xác nhận</option>
                    <option value="DA_CHECKIN">Đang lưu trú</option>
                    <option value="HOAN_THANH">Hoàn thành</option>
                    <option value="DA_HUY">Đã hủy</option>
                    <option value="TU_CHOI">Từ chối</option>
                  </select>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Đơn</th>
                      <th>Khách sạn</th>
                      <th>Khách hàng</th>
                      <th>Nhận → Trả</th>
                      <th>Tổng / Thực nhận</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Chưa có đơn đặt phòng phù hợp bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => {
                        const st = getStatusBadge(b.trang_thai_don);
                        const pst = getStatusBadge(b.trang_thai_thanh_toan);
                        return (
                          <tr key={b.id_dondat}>
                            <td>
                              <strong>#{b.id_dondat}</strong>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{b.ten_khachsan}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {b.so_phong} phòng
                              </div>
                            </td>
                            <td>
                              <div>{b.khach_ho_ten}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {b.khach_sdt || b.khach_email}
                              </div>
                            </td>
                            <td>
                              {formatDate(b.ngay_nhan_phong)} → {formatDate(b.ngay_tra_phong)}
                            </td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{formatCurrency(b.tong_tien)}</div>
                              <div style={{ fontSize: 11.5, color: 'var(--primary)' }}>
                                Thực nhận: {formatCurrency(b.tong_tien - b.phi_hoa_hong)}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                <span className={`badge ${st.cls}`}>{st.label}</span>
                                <span className={`badge ${pst.cls}`}>{pst.label}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => openBookingDetail(b.id_dondat)}
                                  disabled={loadingDetail}
                                >
                                  <Eye size={14} /> Chi tiết
                                </button>
                                {b.trang_thai_don === 'CHO_XAC_NHAN' && (
                                  <>
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleBookingStatusChange(b.id_dondat, 'DA_XAC_NHAN')}
                                    >
                                      Xác nhận
                                    </button>
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() => handleBookingStatusChange(b.id_dondat, 'TU_CHOI')}
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                )}
                                {b.trang_thai_don === 'DA_XAC_NHAN' && (
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleBookingStatusChange(b.id_dondat, 'DA_CHECKIN')}
                                  >
                                    Check-in
                                  </button>
                                )}
                                {b.trang_thai_don === 'DA_CHECKIN' && (
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleBookingStatusChange(b.id_dondat, 'HOAN_THANH')}
                                  >
                                    Hoàn thành
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: QUẢN LÝ KHÁCH SẠN & TIỆN ÍCH */}
          {activeTab === 'hotels' && (
            <div className="card table-wrap">
              <div className="section-header" style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                  Danh sách khách sạn của tôi ({hotels.length})
                </h2>
                <button className="btn btn-primary btn-sm" onClick={openCreateHotel}>
                  <Plus size={15} /> Thêm khách sạn mới
                </button>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Khách sạn</th>
                    <th>Địa điểm</th>
                    <th>Hạng sao</th>
                    <th>Quy mô</th>
                    <th>Trạng thái</th>
                    <th>Quản lý</th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map((h) => {
                    const st = getStatusBadge(h.trang_thai_duyet);
                    return (
                      <tr key={h.id_khachsan}>
                        <td>#{h.id_khachsan}</td>
                        <td>
                          <strong>{h.ten_khachsan}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.dia_chi}</div>
                        </td>
                        <td>
                          {h.quan_huyen}, {h.tinh_thanh}
                        </td>
                        <td>{h.hang_sao || '—'} ★</td>
                        <td>
                          {h.so_loai_phong} loại / {h.tong_so_phong} phòng
                        </td>
                        <td>
                          <span className={`badge ${st.cls}`}>{st.label}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openEditHotel(h.id_khachsan)}
                            >
                              <Edit3 size={13} /> Sửa & Tiện ích
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                setSelectedHotelId(String(h.id_khachsan));
                                setActiveTab('rooms');
                              }}
                            >
                              <BedDouble size={13} /> Phòng
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleSyncHotelAi(h.id_khachsan)}
                              title="Cập nhật vector tìm kiếm Gemini AI"
                            >
                              <Sparkles size={13} /> Sync AI
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteHotel(h.id_khachsan, h.ten_khachsan)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: QUẢN LÝ LOẠI PHÒNG & TÌNH TRẠNG TỪNG PHÒNG */}
          {activeTab === 'rooms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                {renderHotelSelector()}
                {selectedHotelId && (
                  <button className="btn btn-primary btn-sm" onClick={openCreateRoomType}>
                    <Plus size={15} /> Thêm loại phòng
                  </button>
                )}
              </div>

              {roomTypes.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 36 }}>
                  Khách sạn này chưa có loại phòng nào. Bấm <strong>+ Thêm loại phòng</strong> để tạo.
                </div>
              ) : (
                roomTypes.map((rt) => {
                  const rooms = roomsByType[rt.id_loaiphong] || [];
                  return (
                    <div className="card" key={rt.id_loaiphong}>
                      <div className="section-header" style={{ marginBottom: 14 }}>
                        <div>
                          <h3 style={{ fontSize: 17, fontWeight: 800 }}>
                            {rt.ten_loaiphong}{' '}
                            <span style={{ color: 'var(--primary)' }}>
                              · {formatCurrency(rt.gia_moi_dem)}/đêm
                            </span>
                          </h3>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Sức chứa {rt.suc_chua} người {rt.dien_tich ? `· ${rt.dien_tich} m²` : ''} · Tổng{' '}
                            <strong>{rooms.length}</strong> phòng ({rt.so_phong_trong} trống)
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setAddRoomModal(rt)}
                          >
                            <Plus size={14} /> Thêm phòng
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditRoomType(rt)}
                          >
                            <Edit3 size={14} /> Sửa loại
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteRoomType(rt.id_loaiphong)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {rooms.length === 0 ? (
                        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                          Chưa có phòng cụ thể nào thuộc loại phòng này.
                        </p>
                      ) : (
                        <div className="room-status-grid">
                          {rooms.map((rm) => {
                            const stOpt =
                              ROOM_STATUS_OPTIONS.find((o) => o.value === rm.trang_thai_phong) ||
                              ROOM_STATUS_OPTIONS[0];
                            return (
                              <div key={rm.id_phong} className={`room-tile ${stOpt.cls}`}>
                                <div className="room-tile-top">
                                  <strong>Phòng {rm.so_phong}</strong>
                                  <button
                                    type="button"
                                    className="room-del-btn"
                                    onClick={() => handleDeleteRoom(rm.id_phong, rm.so_phong)}
                                    title="Xóa phòng"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                  {rm.tang ? `Tầng ${rm.tang}` : 'Chưa ghi tầng'}
                                </div>
                                <select
                                  className="select"
                                  style={{ padding: '5px 8px', fontSize: 12.5, marginTop: 6 }}
                                  value={rm.trang_thai_phong}
                                  onChange={(e) => handleRoomStatusChange(rm.id_phong, e.target.value)}
                                >
                                  {ROOM_STATUS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 5: QUẢN LÝ DỊCH VỤ ĐI KÈM */}
          {activeTab === 'services' && (
            <div className="card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                {renderHotelSelector()}
                {selectedHotelId && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setSvcForm({ ten_dichvu: '', gia_dichvu: 200000, don_vi_tinh: 'Lượt' });
                      setSvcModal({ mode: 'create' });
                    }}
                  >
                    <Plus size={15} /> Thêm dịch vụ
                  </button>
                )}
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên dịch vụ</th>
                      <th>Giá dịch vụ</th>
                      <th>Đơn vị tính</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Khách sạn chưa có dịch vụ đi kèm nào.
                        </td>
                      </tr>
                    ) : (
                      services.map((s) => (
                        <tr key={s.id_dichvu}>
                          <td>#{s.id_dichvu}</td>
                          <td>
                            <strong>{s.ten_dichvu}</strong>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {formatCurrency(s.gia_dichvu)}
                          </td>
                          <td>{s.don_vi_tinh}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setSvcForm({
                                    ten_dichvu: s.ten_dichvu,
                                    gia_dichvu: s.gia_dichvu,
                                    don_vi_tinh: s.don_vi_tinh,
                                  });
                                  setSvcModal({ mode: 'edit', id: s.id_dichvu });
                                }}
                              >
                                <Edit3 size={13} /> Sửa
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteService(s.id_dichvu)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: VOUCHER RIÊNG CỦA KHÁCH SẠN */}
          {activeTab === 'vouchers' && (
            <div className="card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                    Voucher riêng của khách sạn ({vouchers.length})
                  </h2>
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                    Tạo mã giảm giá áp dụng riêng cho các khách sạn bạn quản lý trên StayWithUs.
                  </p>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setVoucherForm((prev) => ({
                      ...prev,
                      id_khachsan: selectedHotelId || hotels[0]?.id_khachsan || '',
                    }));
                    setVoucherModal(true);
                  }}
                >
                  <Plus size={15} /> Tạo voucher mới
                </button>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã Voucher</th>
                      <th>Áp dụng cho khách sạn</th>
                      <th>Mức giảm</th>
                      <th>Hiệu lực</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Bạn chưa tạo mã voucher riêng nào cho khách sạn. Bấm <strong>+ Tạo voucher mới</strong> để bắt đầu!
                        </td>
                      </tr>
                    ) : (
                      vouchers.map((v) => (
                        <tr key={v.id_khuyenmai}>
                          <td>
                            <span className="qr-code-pill">{v.ma_voucher}</span>
                          </td>
                          <td>
                            <strong>{v.ten_khachsan || `Khách sạn #${v.id_khachsan}`}</strong>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {v.loai_giamgia === 'PHAN_TRAM'
                              ? `Giảm ${v.gia_tri_giam}%`
                              : `Giảm ${formatCurrency(v.gia_tri_giam)}`}
                          </td>
                          <td>
                            {formatDate(v.ngay_batdau)} → {formatDate(v.ngay_ketthuc)}
                          </td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteVoucher(v.id_khuyenmai, v.ma_voucher)}
                            >
                              <Trash2 size={13} /> Xóa
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: ĐÁNH GIÁ KHÁCH HÀNG & HỒ SƠ NCC */}
          {activeTab === 'reviews' && (
            <div className="partner-grid">
              <div className="card">
                <div className="section-header" style={{ marginBottom: 14 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Đánh giá & Phản hồi khách hàng</h2>
                </div>
                <div style={{ marginBottom: 14 }}>{renderHotelSelector()}</div>

                {reviews.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Khách sạn này chưa có đánh giá nào.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {reviews.map((rv) => (
                      <div
                        key={rv.id_danhgia}
                        style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <strong>{rv.ho_ten}</strong>
                          <span className="badge badge-warn">{rv.so_sao} ★</span>
                        </div>
                        <p style={{ fontSize: 14, marginBottom: 10 }}>{rv.noi_dung}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            className="input"
                            placeholder="Nhập lời phản hồi của khách sạn..."
                            value={replyDrafts[rv.id_danhgia] ?? ''}
                            onChange={(e) =>
                              setReplyDrafts({ ...replyDrafts, [rv.id_danhgia]: e.target.value })
                            }
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ whiteSpace: 'nowrap' }}
                            onClick={() => handleReplyReview(rv.id_danhgia)}
                          >
                            Gửi phản hồi
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                  Hồ sơ Doanh nghiệp / NCC
                </h2>
                {vendorProfile && (
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 14 }}>
                    Trạng thái duyệt:{' '}
                    <span className={`badge ${getStatusBadge(vendorProfile.trang_thai_duyet).cls}`}>
                      {getStatusBadge(vendorProfile.trang_thai_duyet).label}
                    </span>{' '}
                    · Chiết khấu: <strong>{vendorProfile.ty_le_chiet_khau}%</strong>
                  </p>
                )}
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="field">
                    <label>Tên doanh nghiệp</label>
                    <input
                      className="input"
                      required
                      value={profileForm.ten_doanh_nghiep}
                      onChange={(e) => setProfileForm({ ...profileForm, ten_doanh_nghiep: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Mã số thuế</label>
                    <input
                      className="input"
                      required
                      value={profileForm.ma_so_thue}
                      onChange={(e) => setProfileForm({ ...profileForm, ma_so_thue: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Số tài khoản nhận đối soát</label>
                    <input
                      className="input"
                      required
                      value={profileForm.so_tai_khoan}
                      onChange={(e) => setProfileForm({ ...profileForm, so_tai_khoan: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Lưu thay đổi hồ sơ
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================
          MODAL CHI TIẾT ĐƠN ĐẶT PHÒNG (FULL DETAILS)
         ============================================ */}
      {bookingDetailModal && (
        <div className="modal-backdrop" onClick={() => setBookingDetailModal(null)}>
          <div className="modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>
                Chi tiết đơn đặt phòng #{bookingDetailModal.id_dondat}
              </h2>
              <span className={`badge ${getStatusBadge(bookingDetailModal.trang_thai_don).cls}`}>
                {getStatusBadge(bookingDetailModal.trang_thai_don).label}
              </span>
            </div>

            <div className="detail-info-grid">
              <div>
                <div className="qr-lbl">Khách hàng</div>
                <strong>{bookingDetailModal.khach_hang?.ho_ten}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {bookingDetailModal.khach_hang?.email} · {bookingDetailModal.khach_hang?.sdt || '—'}
                </div>
              </div>
              <div>
                <div className="qr-lbl">Khách sạn & Lưu trú</div>
                <strong>{bookingDetailModal.khach_san?.ten_khachsan}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {formatDate(bookingDetailModal.ngay_nhan_phong)} →{' '}
                  {formatDate(bookingDetailModal.ngay_tra_phong)}
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Phòng đã đặt</h3>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Loại phòng</th>
                  <th>Đơn giá</th>
                  <th>Số đêm</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(bookingDetailModal.chi_tiet_phong || []).map((r) => (
                  <tr key={r.id_phong}>
                    <td>
                      <strong>{r.so_phong}</strong>
                    </td>
                    <td>{r.ten_loaiphong}</td>
                    <td>{formatCurrency(r.don_gia)}</td>
                    <td>{r.so_dem}</td>
                    <td>{formatCurrency(r.thanh_tien)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {bookingDetailModal.chi_tiet_dich_vu?.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Dịch vụ đi kèm</h3>
                <table className="table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Dịch vụ</th>
                      <th>SL</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingDetailModal.chi_tiet_dich_vu.map((s) => (
                      <tr key={s.id_dichvu}>
                        <td>{s.ten_dichvu}</td>
                        <td>{s.so_luong}</td>
                        <td>{formatCurrency(s.don_gia)}</td>
                        <td>{formatCurrency(s.thanh_tien)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="booking-totals-box">
              {bookingDetailModal.khuyen_mai && (
                <div>
                  Mã khuyến mãi áp dụng: <strong>{bookingDetailModal.khuyen_mai.ma_voucher}</strong>
                </div>
              )}
              <div>
                Tổng tiền đơn: <strong>{formatCurrency(bookingDetailModal.tong_tien)}</strong>
              </div>
              <div>
                Phí hoa hồng sàn: <strong>{formatCurrency(bookingDetailModal.phi_hoa_hong)}</strong> ·
                Thực nhận NCC:{' '}
                <strong style={{ color: 'var(--primary)' }}>
                  {formatCurrency(bookingDetailModal.tong_tien - bookingDetailModal.phi_hoa_hong)}
                </strong>
              </div>
            </div>

            {bookingDetailModal.thanh_toan?.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>
                  Lịch sử thanh toán & Hóa đơn VAT
                </h3>
                {bookingDetailModal.thanh_toan.map((p) => (
                  <div
                    key={p.id_thanhtoan}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div>
                        <strong>{p.phuong_thuc}</strong> · {formatCurrency(p.so_tien)} ·{' '}
                        <code>{p.ma_giao_dich}</code>
                      </div>
                      <span className={`badge ${getStatusBadge(p.trang_thai_tt).cls}`}>
                        {getStatusBadge(p.trang_thai_tt).label}
                      </span>
                    </div>
                    {p.trang_thai_tt === 'CHO_THANH_TOAN' && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={() => handleConfirmPayment(p.id_thanhtoan, 'DA_THANH_TOAN')}
                      >
                        Xác nhận đã thu tiền
                      </button>
                    )}
                    {p.hoa_don && (
                      <div style={{ marginTop: 6, color: '#0f766e', fontSize: 12.5 }}>
                        Hóa đơn VAT #{p.hoa_don.id_hoadon}: {p.hoa_don.ten_cong_ty} (MST:{' '}
                        {p.hoa_don.ma_so_thue}) — {p.hoa_don.email_nhan_hd}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn btn-outline" onClick={() => setBookingDetailModal(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA KHÁCH SẠN + TIỆN ÍCH */}
      {hotelModal && (
        <div className="modal-backdrop" onClick={() => setHotelModal(null)}>
          <div className="modal-box" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>
              {hotelModal.mode === 'create' ? 'Thêm khách sạn mới' : 'Chỉnh sửa khách sạn & Tiện ích'}
            </h2>
            <form onSubmit={handleSaveHotel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Tên khách sạn</label>
                <input
                  className="input"
                  required
                  value={hotelForm.ten_khachsan}
                  onChange={(e) => setHotelForm({ ...hotelForm, ten_khachsan: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Địa điểm</label>
                <select
                  className="select"
                  required
                  value={hotelForm.id_diadiem}
                  onChange={(e) => setHotelForm({ ...hotelForm, id_diadiem: e.target.value })}
                >
                  <option value="">Chọn địa điểm</option>
                  {locations.map((loc) => (
                    <option key={loc.id_diadiem} value={loc.id_diadiem}>
                      {loc.tinh_thanh} — {loc.quan_huyen}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Địa chỉ cụ thể</label>
                <input
                  className="input"
                  required
                  value={hotelForm.dia_chi}
                  onChange={(e) => setHotelForm({ ...hotelForm, dia_chi: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Hạng sao (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="input"
                  value={hotelForm.hang_sao}
                  onChange={(e) => setHotelForm({ ...hotelForm, hang_sao: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mô tả khách sạn</label>
                <textarea
                  rows={3}
                  className="textarea"
                  value={hotelForm.mo_ta}
                  onChange={(e) => setHotelForm({ ...hotelForm, mo_ta: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Tiện ích khách sạn</label>
                <div className="amenity-check-grid">
                  {amenities.map((a) => {
                    const checked = hotelForm.tien_ich_ids.includes(a.id_tienich);
                    return (
                      <label key={a.id_tienich} className={`amenity-check-pill ${checked ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAmenity(a.id_tienich)}
                        />
                        <span>{a.ten_tienich}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" className="btn btn-outline" onClick={() => setHotelModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {hotelModal.mode === 'create' ? 'Tạo khách sạn' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LOẠI PHÒNG */}
      {rtModal && (
        <div className="modal-backdrop" onClick={() => setRtModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>
              {rtModal.mode === 'create' ? 'Thêm loại phòng mới' : 'Chỉnh sửa loại phòng'}
            </h2>
            <form onSubmit={handleSaveRoomType} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Tên loại phòng</label>
                <input
                  className="input"
                  required
                  placeholder="Deluxe Ocean View"
                  value={rtForm.ten_loaiphong}
                  onChange={(e) => setRtForm({ ...rtForm, ten_loaiphong: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Sức chứa (người)</label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    required
                    value={rtForm.suc_chua}
                    onChange={(e) => setRtForm({ ...rtForm, suc_chua: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Diện tích (m²)</label>
                  <input
                    type="number"
                    min={5}
                    className="input"
                    value={rtForm.dien_tich}
                    onChange={(e) => setRtForm({ ...rtForm, dien_tich: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Giá mỗi đêm (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  className="input"
                  required
                  value={rtForm.gia_moi_dem}
                  onChange={(e) => setRtForm({ ...rtForm, gia_moi_dem: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mô tả loại phòng</label>
                <textarea
                  rows={2}
                  className="textarea"
                  value={rtForm.mo_ta_lp}
                  onChange={(e) => setRtForm({ ...rtForm, mo_ta_lp: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setRtModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu loại phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM PHÒNG HÀNG LOẠT */}
      {addRoomModal && (
        <div className="modal-backdrop" onClick={() => setAddRoomModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 6 }}>
              Thêm phòng cho &ldquo;{addRoomModal.ten_loaiphong}&rdquo;
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              Có thể nhập 1 số phòng hoặc nhiều số phòng cách nhau bởi dấu phẩy (VD: 401, 402, 403).
            </p>
            <form onSubmit={handleCreateRooms} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Danh sách số phòng</label>
                <input
                  className="input"
                  required
                  placeholder="401, 402, 403"
                  value={addRoomForm.so_phong_list}
                  onChange={(e) => setAddRoomForm({ ...addRoomForm, so_phong_list: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Tầng</label>
                <input
                  type="number"
                  className="input"
                  value={addRoomForm.tang}
                  onChange={(e) => setAddRoomForm({ ...addRoomForm, tang: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Ghi chú</label>
                <input
                  className="input"
                  placeholder="Ban công hướng biển..."
                  value={addRoomForm.ghi_chu}
                  onChange={(e) => setAddRoomForm({ ...addRoomForm, ghi_chu: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setAddRoomModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DỊCH VỤ */}
      {svcModal && (
        <div className="modal-backdrop" onClick={() => setSvcModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 14 }}>
              {svcModal.mode === 'create' ? 'Thêm dịch vụ mới' : 'Chỉnh sửa dịch vụ'}
            </h2>
            <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Tên dịch vụ</label>
                <input
                  className="input"
                  required
                  placeholder="Đưa đón sân bay / Buffet sáng"
                  value={svcForm.ten_dichvu}
                  onChange={(e) => setSvcForm({ ...svcForm, ten_dichvu: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Giá dịch vụ (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  required
                  value={svcForm.gia_dichvu}
                  onChange={(e) => setSvcForm({ ...svcForm, gia_dichvu: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Đơn vị tính</label>
                <input
                  className="input"
                  required
                  placeholder="Lượt / Suất / Khách / Ngày"
                  value={svcForm.don_vi_tinh}
                  onChange={(e) => setSvcForm({ ...svcForm, don_vi_tinh: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setSvcModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu dịch vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠO VOUCHER KHÁCH SẠN */}
      {voucherModal && (
        <div className="modal-backdrop" onClick={() => setVoucherModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 14 }}>
              Tạo mã Voucher cho khách sạn
            </h2>
            <form onSubmit={handleCreateVoucher} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Áp dụng cho khách sạn</label>
                <select
                  className="select"
                  required
                  value={voucherForm.id_khachsan}
                  onChange={(e) => setVoucherForm({ ...voucherForm, id_khachsan: e.target.value })}
                >
                  {hotels.map((h) => (
                    <option key={h.id_khachsan} value={h.id_khachsan}>
                      {h.ten_khachsan}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Mã Voucher (in hoa, viết liền)</label>
                <input
                  className="input"
                  required
                  placeholder="VD: OCEAN15"
                  value={voucherForm.ma_voucher}
                  onChange={(e) => setVoucherForm({ ...voucherForm, ma_voucher: e.target.value.toUpperCase() })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Loại giảm giá</label>
                  <select
                    className="select"
                    value={voucherForm.loai_giamgia}
                    onChange={(e) => setVoucherForm({ ...voucherForm, loai_giamgia: e.target.value })}
                  >
                    <option value="PHAN_TRAM">Phần trăm (%)</option>
                    <option value="SO_TIEN">Số tiền (VNĐ)</option>
                  </select>
                </div>
                <div className="field">
                  <label>Giá trị giảm</label>
                  <input
                    type="number"
                    min={1}
                    max={voucherForm.loai_giamgia === 'PHAN_TRAM' ? 100 : 50000000}
                    className="input"
                    required
                    value={voucherForm.gia_tri_giam}
                    onChange={(e) => setVoucherForm({ ...voucherForm, gia_tri_giam: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Ngày bắt đầu</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={voucherForm.ngay_batdau}
                    onChange={(e) => setVoucherForm({ ...voucherForm, ngay_batdau: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Ngày kết thúc</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={voucherForm.ngay_ketthuc}
                    onChange={(e) => setVoucherForm({ ...voucherForm, ngay_ketthuc: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setVoucherModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo mã Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
