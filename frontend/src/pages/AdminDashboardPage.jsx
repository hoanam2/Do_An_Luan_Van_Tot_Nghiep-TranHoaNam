import { useEffect, useState } from 'react';
import {
  BarChart3,
  CreditCard,
  Eye,
  Gift,
  Lock,
  Plus,
  Sparkles,
  Ticket,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate, getStatusBadge } from '../utils/format';

const ADMIN_TABS = [
  { id: 'overview', label: 'Tổng quan & Doanh thu', icon: BarChart3 },
  { id: 'vouchers', label: 'Voucher toàn sàn', icon: Ticket },
  { id: 'events', label: 'Sự kiện đặc quyền', icon: Gift },
  { id: 'payments', label: 'Quản lý Thanh toán', icon: CreditCard },
  { id: 'customers', label: 'Khách hàng & Lịch sử', icon: Users },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [syncingAi, setSyncingAi] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dữ liệu quản trị toàn sàn
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [events, setEvents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Bộ lọc thanh toán & khách hàng
  const [payStatusFilter, setPayStatusFilter] = useState('');
  const [payMethodFilter, setPayMethodFilter] = useState('');
  const [customerKeyword, setCustomerKeyword] = useState('');
  const [historyModal, setHistoryModal] = useState(null);

  // Modal tạo voucher toàn sàn
  const [voucherModal, setVoucherModal] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    ma_voucher: '',
    loai_giamgia: 'PHAN_TRAM',
    gia_tri_giam: 15,
    ngay_batdau: new Date().toISOString().slice(0, 10),
    ngay_ketthuc: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
  });

  // Modal tạo sự kiện đặc quyền
  const [eventModal, setEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    tieu_de: '',
    mo_ta: '',
    doi_tuong: 'THANH_VIEN',
    dac_quyen: '',
    ma_voucher_kem: '',
    ngay_batdau: new Date().toISOString().slice(0, 10),
    ngay_ketthuc: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    trang_thai: 'DANG_DIEN_RA',
  });

  const notify = (msg) => {
    setError('');
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ovRes, revRes, vRes, evRes, payRes, cusRes] = await Promise.all([
        apiClient.get('/reports/admin/overview'),
        apiClient.get('/reports/admin/revenue?year=2026'),
        apiClient.get('/vouchers?all=true'),
        apiClient.get('/events?all=true'),
        apiClient.get('/payments/admin/all'),
        apiClient.get('/reports/admin/customers'),
      ]);

      setOverview(ovRes.data?.data);
      setRevenue(revRes.data?.data);
      // Lọc các voucher toàn sàn (id_khachsan === null) cho Admin quản lý
      setVouchers((vRes.data?.data || []).filter((v) => !v.id_khachsan));
      setEvents(evRes.data?.data || []);
      setPayments(payRes.data?.data || []);
      setCustomers(cusRes.data?.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncAi = async () => {
    setSyncingAi(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/ai/embeddings/sync', { only_missing: false });
      notify(res.data?.message || 'Đã đồng bộ vector AI Gemini thành công.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSyncingAi(false);
    }
  };

  // --- VOUCHER TOÀN SÀN ---
  const handleCreatePlatformVoucher = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/vouchers', {
        id_khachsan: null,
        ma_voucher: voucherForm.ma_voucher.trim().toUpperCase(),
        loai_giamgia: voucherForm.loai_giamgia,
        gia_tri_giam: Number(voucherForm.gia_tri_giam),
        ngay_batdau: `${voucherForm.ngay_batdau}T00:00:00Z`,
        ngay_ketthuc: `${voucherForm.ngay_ketthuc}T23:59:59Z`,
      });
      setVoucherModal(false);
      setVoucherForm((prev) => ({ ...prev, ma_voucher: '' }));
      notify('Đã tạo voucher toàn sàn StayWithUs thành công!');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteVoucher = async (id, code) => {
    if (!window.confirm(`Xác nhận xóa voucher toàn sàn "${code}"?`)) return;
    setError('');
    try {
      await apiClient.delete(`/vouchers/${id}`);
      notify(`Đã xóa voucher "${code}".`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // --- SỰ KIỆN ĐẶC QUYỀN ---
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/events', {
        ...eventForm,
        ngay_batdau: `${eventForm.ngay_batdau}T00:00:00Z`,
        ngay_ketthuc: `${eventForm.ngay_ketthuc}T23:59:59Z`,
      });
      setEventModal(false);
      setEventForm((prev) => ({ ...prev, tieu_de: '', mo_ta: '', dac_quyen: '', ma_voucher_kem: '' }));
      notify('Đã tạo sự kiện đặc quyền cho khách hàng!');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggleEventStatus = async (ev) => {
    const nextStatus = ev.trang_thai === 'DANG_DIEN_RA' ? 'TAM_DUNG' : 'DANG_DIEN_RA';
    setError('');
    try {
      await apiClient.put(`/events/${ev.id_sukien}`, { trang_thai: nextStatus });
      notify(`Đã chuyển trạng thái sự kiện "${ev.tieu_de}" sang ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteEvent = async (id, title) => {
    if (!window.confirm(`Xác nhận xóa sự kiện "${title}"?`)) return;
    setError('');
    try {
      await apiClient.delete(`/events/${id}`);
      notify(`Đã xóa sự kiện "${title}".`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // --- QUẢN LÝ THANH TOÁN ---
  const handleConfirmPayment = async (paymentId, status) => {
    setError('');
    try {
      await apiClient.post(`/payments/${paymentId}/confirm`, { trang_thai_tt: status });
      notify(`Đã cập nhật giao dịch #${paymentId} thành ${status}.`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // --- QUẢN LÝ KHÁCH HÀNG & LỊCH SỬ ---
  const openCustomerHistory = async (customerId) => {
    setError('');
    try {
      const res = await apiClient.get(`/reports/admin/customers/${customerId}/history`);
      setHistoryModal(res.data?.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggleUserLock = async (customer) => {
    const nextStatus = customer.trang_thai_tk === 'BI_KHOA' ? 'HOAT_DONG' : 'BI_KHOA';
    if (
      !window.confirm(
        `Xác nhận ${nextStatus === 'BI_KHOA' ? 'KHÓA' : 'MỞ KHÓA'} tài khoản "${customer.email}"?`
      )
    ) {
      return;
    }
    setError('');
    try {
      await apiClient.patch(`/reports/admin/users/${customer.id_nguoidung}/status`, {
        trang_thai_tk: nextStatus,
      });
      notify(`Đã cập nhật trạng thái tài khoản ${customer.email} thành ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const filteredPayments = payments.filter((p) => {
    const okStatus = !payStatusFilter || p.trang_thai_tt === payStatusFilter;
    const okMethod = !payMethodFilter || p.phuong_thuc === payMethodFilter;
    return okStatus && okMethod;
  });

  const filteredCustomers = customers.filter((c) => {
    const q = customerKeyword.trim().toLowerCase();
    if (!q) return true;
    return (
      String(c.ho_ten || '').toLowerCase().includes(q) ||
      String(c.email || '').toLowerCase().includes(q) ||
      String(c.sdt || '').toLowerCase().includes(q)
    );
  });

  const maxMonthly = Math.max(1, ...(revenue?.theo_thang || []).map((m) => m.doanh_thu));

  return (
    <div className="container section">
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="section-title">Quản trị Hệ thống StayWithUs (Admin Dashboard)</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Thống kê toàn sàn, phát hành voucher website, tổ chức sự kiện đặc quyền, quản lý thanh toán & lịch sử khách hàng.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSyncAi} disabled={syncingAi}>
          <Sparkles size={15} /> {syncingAi ? 'Đang tạo vector Gemini...' : 'Đồng bộ Vector AI'}
        </button>
      </div>

      {/* Thanh Tabs 5 phân hệ quản trị */}
      <div className="vendor-tabs">
        {ADMIN_TABS.map((t) => {
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
              {t.id === 'payments' && payments.length > 0 && (
                <span className="vendor-tab-count">{payments.length}</span>
              )}
              {t.id === 'customers' && customers.length > 0 && (
                <span className="vendor-tab-count">{customers.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="card">Đang tải dữ liệu quản trị...</div>
      ) : (
        <>
          {/* TAB 1: TỔNG QUAN & DOANH THU */}
          {activeTab === 'overview' && (
            <>
              {overview && (
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-label">Tổng doanh thu sàn</div>
                    <div className="kpi-value" style={{ color: 'var(--primary)' }}>
                      {formatCurrency(overview.don_dat_phong.tong_doanh_thu)}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      Tổng {overview.don_dat_phong.tong_don} đơn đặt phòng
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Phí hoa hồng sàn</div>
                    <div className="kpi-value">{formatCurrency(overview.don_dat_phong.tong_hoa_hong)}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      Đã thanh toán: {formatCurrency(overview.thanh_toan.tong_da_thanh_toan)}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Đối tác NCC</div>
                    <div className="kpi-value">{overview.nha_cung_cap.tong_ncc}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      Đã duyệt: {overview.nha_cung_cap.da_duyet} · Chờ duyệt: {overview.nha_cung_cap.cho_duyet}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Khách sạn toàn hệ thống</div>
                    <div className="kpi-value">{overview.khach_san.tong_khach_san}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      Đã duyệt: {overview.khach_san.da_duyet} · Chờ duyệt: {overview.khach_san.cho_duyet}
                    </div>
                  </div>
                </div>
              )}

              {revenue && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                    Biểu đồ Doanh thu sàn 12 tháng (Năm {revenue.nam})
                  </h2>
                  <div className="bar-chart">
                    {revenue.theo_thang.map((m) => (
                      <div
                        className="bar-col"
                        key={m.thang}
                        title={`T${m.thang}: Doanh thu ${formatCurrency(m.doanh_thu)} | Hoa hồng ${formatCurrency(m.phi_hoa_hong)}`}
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

              {revenue?.top_khach_san?.length > 0 && (
                <div className="card table-wrap">
                  <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
                    Top Khách sạn có doanh thu cao nhất
                  </h2>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Khách sạn</th>
                        <th>Địa điểm</th>
                        <th>Số đơn</th>
                        <th>Doanh thu</th>
                        <th>Hoa hồng sàn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.top_khach_san.map((h) => (
                        <tr key={h.id_khachsan}>
                          <td>
                            <strong>{h.ten_khachsan}</strong>
                          </td>
                          <td>{h.tinh_thanh}</td>
                          <td>{h.so_don}</td>
                          <td style={{ fontWeight: 700 }}>{formatCurrency(h.doanh_thu)}</td>
                          <td style={{ color: 'var(--primary)', fontWeight: 700 }}>
                            {formatCurrency(h.phi_hoa_hong)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB 2: VOUCHER TOÀN SÀN STAYWITHUS */}
          {activeTab === 'vouchers' && (
            <div className="card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                    Voucher toàn sàn StayWithUs ({vouchers.length})
                  </h2>
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                    Các mã giảm giá do website phát hành — áp dụng được cho tất cả khách sạn trên sàn.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setVoucherModal(true)}>
                  <Plus size={15} /> Thêm voucher website
                </button>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã Voucher</th>
                      <th>Loại giảm</th>
                      <th>Giá trị giảm</th>
                      <th>Thời gian áp dụng</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Chưa có mã voucher toàn sàn nào.
                        </td>
                      </tr>
                    ) : (
                      vouchers.map((v) => (
                        <tr key={v.id_khuyenmai}>
                          <td>
                            <span className="qr-code-pill">{v.ma_voucher}</span>
                          </td>
                          <td>{v.loai_giamgia === 'PHAN_TRAM' ? 'Theo phần trăm (%)' : 'Trừ tiền trực tiếp'}</td>
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

          {/* TAB 3: SỰ KIỆN ĐẶC QUYỀN KHÁCH HÀNG */}
          {activeTab === 'events' && (
            <div className="card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                    Sự kiện & Đặc quyền Khách hàng ({events.length})
                  </h2>
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                    Tạo các chương trình đặc quyền cho thành viên — tự động hiển thị tại trang Ưu đãi của website.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setEventModal(true)}>
                  <Plus size={15} /> Tạo sự kiện đặc quyền
                </button>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sự kiện</th>
                      <th>Đối tượng</th>
                      <th>Đặc quyền</th>
                      <th>Mã kèm</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr key={ev.id_sukien}>
                        <td>
                          <strong>{ev.tieu_de}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 260 }}>
                            {ev.mo_ta}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-info">{ev.doi_tuong}</span>
                        </td>
                        <td style={{ fontSize: 13 }}>{ev.dac_quyen}</td>
                        <td>
                          {ev.ma_voucher_kem ? (
                            <span className="qr-code-pill">{ev.ma_voucher_kem}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ fontSize: 12.5 }}>
                          {formatDate(ev.ngay_batdau)} → {formatDate(ev.ngay_ketthuc)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              ev.trang_thai === 'DANG_DIEN_RA' ? 'badge-success' : 'badge-muted'
                            }`}
                          >
                            {ev.trang_thai === 'DANG_DIEN_RA' ? 'Đang diễn ra' : 'Tạm dừng'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleToggleEventStatus(ev)}
                            >
                              {ev.trang_thai === 'DANG_DIEN_RA' ? 'Tạm dừng' : 'Kích hoạt'}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteEvent(ev.id_sukien, ev.tieu_de)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: QUẢN LÝ THANH TOÁN TOÀN SÀN */}
          {activeTab === 'payments' && (
            <div className="card">
              <div className="section-header" style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                  Quản lý giao dịch thanh toán ({filteredPayments.length})
                </h2>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <select
                    className="select"
                    style={{ width: 170 }}
                    value={payMethodFilter}
                    onChange={(e) => setPayMethodFilter(e.target.value)}
                  >
                    <option value="">Tất cả phương thức</option>
                    <option value="VNPAY">VNPay</option>
                    <option value="MOMO">MoMo</option>
                    <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                    <option value="THE_TIN_DUNG">Thẻ tín dụng</option>
                    <option value="TIEN_MAT">Tiền mặt</option>
                  </select>
                  <select
                    className="select"
                    style={{ width: 180 }}
                    value={payStatusFilter}
                    onChange={(e) => setPayStatusFilter(e.target.value)}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="CHO_THANH_TOAN">Chờ thanh toán</option>
                    <option value="DA_THANH_TOAN">Đã thanh toán</option>
                    <option value="DA_HOAN_TIEN">Đã hoàn tiền</option>
                    <option value="THAT_BAI">Thất bại</option>
                  </select>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã GD</th>
                      <th>Đơn / Khách sạn</th>
                      <th>Khách hàng</th>
                      <th>Phương thức</th>
                      <th>Số tiền / Hoa hồng</th>
                      <th>Hóa đơn VAT</th>
                      <th>Trạng thái</th>
                      <th>Xử lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => {
                      const st = getStatusBadge(p.trang_thai_tt);
                      return (
                        <tr key={p.id_thanhtoan}>
                          <td>
                            <strong>#{p.id_thanhtoan}</strong>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                              {p.ma_giao_dich || '—'}
                            </div>
                          </td>
                          <td>
                            <div>Đơn #{p.id_dondat}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.ten_khachsan}</div>
                          </td>
                          <td>
                            <div>{p.khach_hang?.ho_ten}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {p.khach_hang?.email}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info">{p.phuong_thuc}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{formatCurrency(p.so_tien)}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--primary)' }}>
                              Hoa hồng: {formatCurrency(p.phi_hoa_hong)}
                            </div>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {p.hoa_don ? (
                              <>
                                <strong>HD #{p.hoa_don.id_hoadon}</strong>
                                <div>MST: {p.hoa_don.ma_so_thue}</div>
                              </>
                            ) : (
                              'Chưa xuất'
                            )}
                          </td>
                          <td>
                            <span className={`badge ${st.cls}`}>{st.label}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {p.trang_thai_tt === 'CHO_THANH_TOAN' && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleConfirmPayment(p.id_thanhtoan, 'DA_THANH_TOAN')}
                                >
                                  Xác nhận thu
                                </button>
                              )}
                              {p.trang_thai_tt === 'DA_THANH_TOAN' && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleConfirmPayment(p.id_thanhtoan, 'DA_HOAN_TIEN')}
                                >
                                  Hoàn tiền
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: KHÁCH HÀNG & LỊCH SỬ GIAO DỊCH */}
          {activeTab === 'customers' && (
            <div className="card">
              <div className="section-header" style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                  Danh sách Khách hàng & Lịch sử ({filteredCustomers.length})
                </h2>
                <input
                  className="input"
                  style={{ maxWidth: 300 }}
                  placeholder="Tìm tên, email hoặc SĐT khách hàng..."
                  value={customerKeyword}
                  onChange={(e) => setCustomerKeyword(e.target.value)}
                />
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Khách hàng</th>
                      <th>SĐT</th>
                      <th>Số đơn</th>
                      <th>Tổng chi tiêu</th>
                      <th>Đánh giá</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c) => {
                      const isLocked = c.trang_thai_tk === 'BI_KHOA';
                      return (
                        <tr key={c.id_nguoidung}>
                          <td>#{c.id_nguoidung}</td>
                          <td>
                            <strong>{c.ho_ten}</strong>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email}</div>
                          </td>
                          <td>{c.sdt || '—'}</td>
                          <td>{c.tong_so_don}</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {formatCurrency(c.tong_chi_tieu)}
                          </td>
                          <td>{c.so_danh_gia}</td>
                          <td>
                            <span
                              className={`badge ${
                                isLocked
                                  ? 'badge-danger'
                                  : c.trang_thai_tk === 'HOAT_DONG'
                                  ? 'badge-success'
                                  : 'badge-warn'
                              }`}
                            >
                              {c.trang_thai_tk}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => openCustomerHistory(c.id_nguoidung)}
                              >
                                <Eye size={13} /> Lịch sử
                              </button>
                              <button
                                className={`btn btn-sm ${isLocked ? 'btn-primary' : 'btn-danger'}`}
                                onClick={() => handleToggleUserLock(c)}
                              >
                                {isLocked ? (
                                  <>
                                    <Unlock size={13} /> Mở
                                  </>
                                ) : (
                                  <>
                                    <Lock size={13} /> Khóa
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL TẠO VOUCHER TOÀN SÀN */}
      {voucherModal && (
        <div className="modal-backdrop" onClick={() => setVoucherModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 14 }}>
              Thêm Voucher toàn sàn StayWithUs
            </h2>
            <form onSubmit={handleCreatePlatformVoucher} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Mã Voucher</label>
                <input
                  className="input"
                  required
                  value={voucherForm.ma_voucher}
                  onChange={(e) =>
                    setVoucherForm({ ...voucherForm, ma_voucher: e.target.value.toUpperCase() })
                  }
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
                  Phát hành Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠO SỰ KIỆN ĐẶC QUYỀN */}
      {eventModal && (
        <div className="modal-backdrop" onClick={() => setEventModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 14 }}>
              Tạo Sự kiện Đặc quyền Khách hàng
            </h2>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Tên sự kiện</label>
                <input
                  className="input"
                  required
                  value={eventForm.tieu_de}
                  onChange={(e) => setEventForm({ ...eventForm, tieu_de: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mô tả ngắn</label>
                <textarea
                  rows={2}
                  className="textarea"
                  required
                  value={eventForm.mo_ta}
                  onChange={(e) => setEventForm({ ...eventForm, mo_ta: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Đặc quyền dành cho khách hàng</label>
                <input
                  className="input"
                  required
                  value={eventForm.dac_quyen}
                  onChange={(e) => setEventForm({ ...eventForm, dac_quyen: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Đối tượng áp dụng</label>
                  <select
                    className="select"
                    value={eventForm.doi_tuong}
                    onChange={(e) => setEventForm({ ...eventForm, doi_tuong: e.target.value })}
                  >
                    <option value="TAT_CA">Tất cả khách hàng</option>
                    <option value="THANH_VIEN">Thành viên đăng nhập</option>
                    <option value="KHACH_MOI">Khách hàng mới</option>
                    <option value="KHACH_VIP">Khách hàng VIP</option>
                  </select>
                </div>
                <div className="field">
                  <label>Mã voucher đính kèm (tùy chọn)</label>
                  <input
                    className="input"
                    value={eventForm.ma_voucher_kem}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, ma_voucher_kem: e.target.value.toUpperCase() })
                    }
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
                    value={eventForm.ngay_batdau}
                    onChange={(e) => setEventForm({ ...eventForm, ngay_batdau: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Ngày kết thúc</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={eventForm.ngay_ketthuc}
                    onChange={(e) => setEventForm({ ...eventForm, ngay_ketthuc: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setEventModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo sự kiện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM LỊCH SỬ KHÁCH HÀNG */}
      {historyModal && (
        <div className="modal-backdrop" onClick={() => setHistoryModal(null)}>
          <div className="modal-box" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>
              Lịch sử khách hàng: {historyModal.khach_hang?.ho_ten}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              {historyModal.khach_hang?.email} · SĐT: {historyModal.khach_hang?.sdt || '—'}
            </p>

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              Lịch sử đặt phòng ({historyModal.lich_su_dat_phong?.length || 0})
            </h3>
            {historyModal.lich_su_dat_phong?.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chưa có đơn đặt phòng nào.</p>
            ) : (
              <table className="table" style={{ fontSize: 12.5, marginBottom: 14 }}>
                <thead>
                  <tr>
                    <th>Đơn</th>
                    <th>Khách sạn</th>
                    <th>Lưu trú</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {historyModal.lich_su_dat_phong.map((b) => (
                    <tr key={b.id_dondat}>
                      <td>#{b.id_dondat}</td>
                      <td>{b.ten_khachsan}</td>
                      <td>
                        {formatDate(b.ngay_nhan_phong)} → {formatDate(b.ngay_tra_phong)}
                      </td>
                      <td>{formatCurrency(b.tong_tien)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(b.trang_thai_don).cls}`}>
                          {getStatusBadge(b.trang_thai_don).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              Lịch sử thanh toán ({historyModal.lich_su_thanh_toan?.length || 0})
            </h3>
            {historyModal.lich_su_thanh_toan?.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chưa có giao dịch thanh toán nào.</p>
            ) : (
              <table className="table" style={{ fontSize: 12.5, marginBottom: 14 }}>
                <thead>
                  <tr>
                    <th>Mã GD</th>
                    <th>Phương thức</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {historyModal.lich_su_thanh_toan.map((p) => (
                    <tr key={p.id_thanhtoan}>
                      <td>{p.ma_giao_dich || `#${p.id_thanhtoan}`}</td>
                      <td>{p.phuong_thuc}</td>
                      <td>{formatCurrency(p.so_tien)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(p.trang_thai_tt).cls}`}>
                          {getStatusBadge(p.trang_thai_tt).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setHistoryModal(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
