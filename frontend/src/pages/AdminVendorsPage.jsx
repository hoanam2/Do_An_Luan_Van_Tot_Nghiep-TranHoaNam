import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Handshake, Percent, Search, ShieldAlert, XCircle } from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { getStatusBadge } from '../utils/format';

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [commissionDrafts, setCommissionDrafts] = useState({});

  const notify = (msg) => {
    setError('');
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [vRes, hRes] = await Promise.all([
        apiClient.get('/vendors', {
          params: {
            ...(statusFilter ? { trang_thai_duyet: statusFilter } : {}),
            ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
          },
        }),
        apiClient.get('/hotels/admin/all'),
      ]);
      const vList = vRes.data?.data || [];
      setVendors(vList);
      setHotels(hRes.data?.data || []);
      setCommissionDrafts(
        Object.fromEntries(vList.map((v) => [v.id_ncc, String(v.ty_le_chiet_khau ?? 10)]))
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleUpdateVendor = async (vendorId, payload, message) => {
    setError('');
    try {
      await apiClient.patch(`/vendors/${vendorId}/approval`, payload);
      notify(message);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleApproveHotel = async (hotelId, status) => {
    setError('');
    try {
      await apiClient.patch(`/hotels/${hotelId}/approval`, { trang_thai_duyet: status });
      notify(`Đã cập nhật trạng thái hiển thị khách sạn #${hotelId} thành ${status}.`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const stats = {
    total: vendors.length,
    approved: vendors.filter((v) => v.trang_thai_duyet === 'DA_DUYET').length,
    pending: vendors.filter((v) => v.trang_thai_duyet === 'CHO_DUYET').length,
    suspended: vendors.filter((v) => ['TU_CHOI', 'TAM_NGUNG'].includes(v.trang_thai_duyet)).length,
  };

  const vendorHotels = selectedVendor
    ? hotels.filter((h) => Number(h.id_ncc) === Number(selectedVendor.id_ncc))
    : [];

  return (
    <div className="container section">
      <div className="section-header" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Handshake size={24} color="#0f766e" /> Quản lý Hợp tác Nhà cung cấp (Admin)
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Phê duyệt hồ sơ đối tác, cấu hình tỷ lệ chiết khấu hoa hồng và kiểm duyệt khách sạn
            đăng ký hợp tác. <em>(Admin không can thiệp vào vận hành phòng, dịch vụ hay voucher riêng của khách sạn.)</em>
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* KPI đối tác */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Tổng đối tác NCC</div>
          <div className="kpi-value">{stats.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Đang hợp tác (Đã duyệt)</div>
          <div className="kpi-value" style={{ color: '#16a34a' }}>
            {stats.approved}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Hồ sơ chờ phê duyệt</div>
          <div className="kpi-value" style={{ color: '#b45309' }}>
            {stats.pending}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Từ chối / Tạm ngưng</div>
          <div className="kpi-value" style={{ color: '#dc2626' }}>
            {stats.suspended}
          </div>
        </div>
      </div>

      {/* Bộ lọc tìm kiếm NCC */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadData();
          }}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <input
            className="input"
            style={{ flex: 1, minWidth: 240 }}
            placeholder="Tìm theo tên doanh nghiệp, mã số thuế, email người đại diện..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select
            className="select"
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái hợp tác</option>
            <option value="CHO_DUYET">Chờ duyệt</option>
            <option value="DA_DUYET">Đã duyệt</option>
            <option value="TAM_NGUNG">Tạm ngưng</option>
            <option value="TU_CHOI">Từ chối</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm" style={{ height: 40 }}>
            <Search size={15} /> Tìm kiếm
          </button>
        </form>
      </div>

      {/* Bảng danh sách hồ sơ hợp tác NCC */}
      <div className="card table-wrap" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
          Danh sách Hồ sơ Hợp tác Nhà cung cấp ({vendors.length})
        </h2>

        {loading ? (
          <p>Đang tải danh sách đối tác...</p>
        ) : vendors.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Không có hồ sơ nhà cung cấp nào khớp bộ lọc.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Doanh nghiệp & Đại diện</th>
                <th>MST / Tài khoản đối soát</th>
                <th>Số KS</th>
                <th>Chiết khấu (%)</th>
                <th>Trạng thái hợp tác</th>
                <th>Thao tác quản trị</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => {
                const st = getStatusBadge(v.trang_thai_duyet);
                return (
                  <tr key={v.id_ncc}>
                    <td>#{v.id_ncc}</td>
                    <td>
                      <strong>{v.ten_doanh_nghiep}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {v.nguoi_dung?.ho_ten} · {v.nguoi_dung?.email}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>MST: {v.ma_so_thue}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        STK: {v.so_tai_khoan}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelectedVendor(v)}
                      >
                        <Building2 size={13} /> {v.so_khach_san || 0} KS
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          className="input"
                          style={{ width: 72, padding: '5px 8px', fontSize: 13 }}
                          value={commissionDrafts[v.id_ncc] ?? v.ty_le_chiet_khau}
                          onChange={(e) =>
                            setCommissionDrafts({ ...commissionDrafts, [v.id_ncc]: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          title="Lưu tỷ lệ chiết khấu"
                          onClick={() =>
                            handleUpdateVendor(
                              v.id_ncc,
                              { ty_le_chiet_khau: Number(commissionDrafts[v.id_ncc]) },
                              `Đã cập nhật chiết khấu của "${v.ten_doanh_nghiep}" thành ${commissionDrafts[v.id_ncc]}%.`
                            )
                          }
                        >
                          <Percent size={13} /> Lưu
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {v.trang_thai_duyet !== 'DA_DUYET' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              handleUpdateVendor(
                                v.id_ncc,
                                { trang_thai_duyet: 'DA_DUYET' },
                                `Đã phê duyệt hợp tác cho "${v.ten_doanh_nghiep}".`
                              )
                            }
                          >
                            <CheckCircle2 size={13} /> Duyệt
                          </button>
                        )}
                        {v.trang_thai_duyet === 'DA_DUYET' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() =>
                              handleUpdateVendor(
                                v.id_ncc,
                                { trang_thai_duyet: 'TAM_NGUNG' },
                                `Đã tạm ngưng hợp tác với "${v.ten_doanh_nghiep}".`
                              )
                            }
                          >
                            <ShieldAlert size={13} /> Tạm ngưng
                          </button>
                        )}
                        {v.trang_thai_duyet === 'CHO_DUYET' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() =>
                              handleUpdateVendor(
                                v.id_ncc,
                                { trang_thai_duyet: 'TU_CHOI' },
                                `Đã từ chối hồ sơ "${v.ten_doanh_nghiep}".`
                              )
                            }
                          >
                            <XCircle size={13} /> Từ chối
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

      {/* Modal kiểm duyệt danh sách khách sạn thuộc đối tác (chỉ xem & duyệt/ẩn) */}
      {selectedVendor && (
        <div className="modal-backdrop" onClick={() => setSelectedVendor(null)}>
          <div className="modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>
              Khách sạn của đối tác: {selectedVendor.ten_doanh_nghiep}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              Admin chỉ kiểm duyệt trạng thái hiển thị trên sàn (không chỉnh sửa phòng hay voucher của khách sạn).
            </p>

            {vendorHotels.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Đối tác này chưa đăng ký khách sạn nào.
              </p>
            ) : (
              <table className="table" style={{ fontSize: 13.5 }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Khách sạn</th>
                    <th>Địa điểm</th>
                    <th>Trạng thái</th>
                    <th>Kiểm duyệt</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorHotels.map((h) => {
                    const st = getStatusBadge(h.trang_thai_duyet);
                    return (
                      <tr key={h.id_khachsan}>
                        <td>#{h.id_khachsan}</td>
                        <td>
                          <strong>{h.ten_khachsan}</strong> ({h.hang_sao || '—'}★)
                        </td>
                        <td>{h.tinh_thanh}</td>
                        <td>
                          <span className={`badge ${st.cls}`}>{st.label}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {h.trang_thai_duyet !== 'DA_DUYET' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleApproveHotel(h.id_khachsan, 'DA_DUYET')}
                              >
                                Duyệt
                              </button>
                            )}
                            {h.trang_thai_duyet !== 'AN' && (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleApproveHotel(h.id_khachsan, 'AN')}
                              >
                                Ẩn
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn btn-outline" onClick={() => setSelectedVendor(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
