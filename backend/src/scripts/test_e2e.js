/**
 * Script kiểm thử End-to-End (E2E) toàn bộ 4 giai đoạn API đang chạy tại http://localhost:5000/api
 * Yêu cầu: Đã chạy `npm run seed`, `npm run seed:demo`, `npm run migrate:ai` và server `npm run dev`.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

let passed = 0;
let failed = 0;

const api = async (method, endpoint, { token = null, body = null } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

const runTest = async (label, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  [PASS] ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`  [FAIL] ${label} -> ${err.message}`);
  }
};

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

(async () => {
  console.log(`\n=== BẮT ĐẦU KIỂM THỬ E2E API (${BASE_URL}) ===\n`);

  let adminToken = '';
  let vendorToken = '';
  let userToken = '';
  let sampleHotelId = null;
  let sampleRoomId = null;
  let createdBookingId = null;
  let createdPaymentId = null;

  // --- GIAI ĐOẠN 1 ---
  console.log('--- Giai đoạn 1: Health, Auth JWT & RBAC ---');
  await runTest('GET /health kiểm tra DB PostgreSQL', async () => {
    const r = await api('GET', '/health');
    assert(r.status === 200 && r.data.success, `Status ${r.status}`);
  });

  await runTest('POST /auth/login (Admin)', async () => {
    const r = await api('POST', '/auth/login', {
      body: { email: 'admin@smarthotel.vn', mat_khau: 'Admin@123' },
    });
    assert(r.status === 200 && r.data?.data?.token, `Login Admin thất bại: ${r.data?.message}`);
    adminToken = r.data.data.token;
  });

  await runTest('POST /auth/login (Vendor)', async () => {
    const r = await api('POST', '/auth/login', {
      body: { email: 'vendor.danang@smarthotel.vn', mat_khau: 'Vendor@123' },
    });
    assert(r.status === 200 && r.data?.data?.token, `Login Vendor thất bại: ${r.data?.message}`);
    vendorToken = r.data.data.token;
  });

  await runTest('POST /auth/login (User)', async () => {
    const r = await api('POST', '/auth/login', {
      body: { email: 'khach1@smarthotel.vn', mat_khau: 'User@123' },
    });
    assert(r.status === 200 && r.data?.data?.token, `Login User thất bại: ${r.data?.message}`);
    userToken = r.data.data.token;
  });

  await runTest('GET /auth/check/admin (RBAC Admin OK, User bị chặn 403)', async () => {
    const okRes = await api('GET', '/auth/check/admin', { token: adminToken });
    const denyRes = await api('GET', '/auth/check/admin', { token: userToken });
    assert(okRes.status === 200, 'Admin không qua được check/admin');
    assert(denyRes.status === 403, `User phải bị 403 nhưng nhận ${denyRes.status}`);
  });

  // --- GIAI ĐOẠN 2 ---
  console.log('\n--- Giai đoạn 2: Danh mục, NCC, Khách sạn & Phòng ---');
  await runTest('GET /categories/locations & /amenities', async () => {
    const loc = await api('GET', '/categories/locations');
    const amen = await api('GET', '/categories/amenities');
    assert(loc.status === 200 && loc.data.data.length > 0, 'Không có địa điểm');
    assert(amen.status === 200 && amen.data.data.length > 0, 'Không có tiện ích');
  });

  await runTest('GET /hotels tìm kiếm khách sạn đã duyệt', async () => {
    const r = await api('GET', '/hotels?sort_by=rating_desc');
    assert(r.status === 200 && r.data.data.length > 0, 'Chưa có khách sạn demo (hãy chạy npm run seed:demo)');
    sampleHotelId = r.data.data[0].id_khachsan;
  });

  await runTest('GET /hotels/:id chi tiết khách sạn & phòng trống', async () => {
    const r = await api('GET', `/hotels/${sampleHotelId}?ngay_nhan_phong=2027-01-10&ngay_tra_phong=2027-01-12`);
    assert(r.status === 200 && r.data.data.loai_phong.length > 0, 'Không lấy được chi tiết khách sạn');
    const rtId = r.data.data.loai_phong[0].id_loaiphong;
    const roomsRes = await api('GET', `/rooms/types/${rtId}/rooms?ngay_nhan_phong=2027-01-10&ngay_tra_phong=2027-01-12`);
    assert(roomsRes.status === 200 && roomsRes.data.data.length > 0, 'Không tìm thấy phòng trống');
    sampleRoomId = roomsRes.data.data[0].id_phong;
  });

  // --- GIAI ĐOẠN 3 ---
  console.log('\n--- Giai đoạn 3: Voucher, Đặt phòng, Thanh toán, Hóa đơn & Đánh giá ---');
  await runTest('POST /vouchers/validate kiểm tra WELCOME10', async () => {
    const r = await api('POST', '/vouchers/validate', {
      body: { ma_voucher: 'WELCOME10', tam_tinh: 2000000 },
    });
    assert(r.status === 200 && r.data.data.so_tien_giam === 200000, 'Tính giảm giá WELCOME10 sai');
  });

  await runTest('POST /bookings tạo đơn đặt phòng có áp mã WELCOME10', async () => {
    const r = await api('POST', '/bookings', {
      token: userToken,
      body: {
        id_khachsan: sampleHotelId,
        ngay_nhan_phong: '2027-01-10',
        ngay_tra_phong: '2027-01-12',
        phong_ids: [sampleRoomId],
        ma_voucher: 'WELCOME10',
      },
    });
    assert(r.status === 201 && r.data.data.id_dondat, `Tạo đơn thất bại: ${r.data?.message}`);
    createdBookingId = r.data.data.id_dondat;
  });

  await runTest('POST /bookings chống đặt trùng phòng (phải trả 409)', async () => {
    const r = await api('POST', '/bookings', {
      token: userToken,
      body: {
        id_khachsan: sampleHotelId,
        ngay_nhan_phong: '2027-01-11',
        ngay_tra_phong: '2027-01-13',
        phong_ids: [sampleRoomId],
      },
    });
    assert(r.status === 409, `Kỳ vọng 409 Conflict nhưng nhận ${r.status}`);
  });

  await runTest('POST /payments -> /confirm -> /invoice (Luồng thanh toán & VAT)', async () => {
    const pay = await api('POST', '/payments', {
      token: userToken,
      body: { id_dondat: createdBookingId, phuong_thuc: 'VNPAY' },
    });
    assert(pay.status === 201, `Tạo thanh toán lỗi: ${pay.data?.message}`);
    createdPaymentId = pay.data.data.id_thanhtoan;

    const conf = await api('POST', `/payments/${createdPaymentId}/confirm`, {
      token: userToken,
      body: { trang_thai_tt: 'DA_THANH_TOAN' },
    });
    assert(conf.status === 200 && conf.data.data.trang_thai_tt === 'DA_THANH_TOAN', 'Xác nhận thanh toán lỗi');

    const inv = await api('POST', `/payments/${createdPaymentId}/invoice`, {
      token: userToken,
      body: {
        ma_so_thue: '0109999888',
        ten_cong_ty: 'Công ty Test E2E',
        email_nhan_hd: 'invoice@test.vn',
      },
    });
    assert(inv.status === 201 && inv.data.data.id_hoadon, `Xuất hóa đơn lỗi: ${inv.data?.message}`);
  });

  await runTest('PATCH /bookings/:id/cancel dọn sạch đơn test', async () => {
    const r = await api('PATCH', `/bookings/${createdBookingId}/cancel`, { token: userToken });
    assert(r.status === 200 && r.data.data.trang_thai_don === 'DA_HUY', `Hủy đơn lỗi: ${r.data?.message}`);
  });

  await runTest('GET /reviews/hotel/:id lấy danh sách & thống kê đánh giá', async () => {
    const r = await api('GET', `/reviews/hotel/${sampleHotelId}`);
    assert(r.status === 200 && r.data.stats !== undefined, 'Lấy đánh giá lỗi');
  });

  // --- GIAI ĐOẠN 4 ---
  console.log('\n--- Giai đoạn 4: AI Tìm kiếm, Chatbot & Báo cáo Thống kê ---');
  await runTest('POST /ai/search tìm kiếm ngôn ngữ tự nhiên', async () => {
    const r = await api('POST', '/ai/search', {
      body: { query: 'Khách sạn 5 sao gần biển Đà Nẵng có hồ bơi vô cực' },
    });
    assert(r.status === 200 && Array.isArray(r.data.data), `AI Search lỗi: ${r.data?.message}`);
  });

  await runTest('POST /ai/chat trợ lý tư vấn đặt phòng', async () => {
    const r = await api('POST', '/ai/chat', {
      body: { message: 'Gợi ý giúp tôi khách sạn đẹp ở Đà Lạt cho cặp đôi' },
    });
    assert(r.status === 200 && r.data.data.reply, `AI Chat lỗi: ${r.data?.message}`);
  });

  await runTest('GET /ai/hotels/:id/similar gợi ý khách sạn tương tự', async () => {
    const r = await api('GET', `/ai/hotels/${sampleHotelId}/similar`);
    assert(r.status === 200 && Array.isArray(r.data.data), 'Gợi ý tương tự lỗi');
  });

  await runTest('GET /reports/admin/overview & /revenue', async () => {
    const ov = await api('GET', '/reports/admin/overview', { token: adminToken });
    const rev = await api('GET', '/reports/admin/revenue?year=2026', { token: adminToken });
    assert(ov.status === 200 && ov.data.data.khach_san, 'Admin overview lỗi');
    assert(rev.status === 200 && rev.data.data.theo_thang.length === 12, 'Admin revenue lỗi');
  });

  await runTest('GET /reports/vendor/overview & /revenue', async () => {
    const ov = await api('GET', '/reports/vendor/overview', { token: vendorToken });
    const rev = await api('GET', '/reports/vendor/revenue?year=2026', { token: vendorToken });
    assert(ov.status === 200 && ov.data.data.don_dat_phong, 'Vendor overview lỗi');
    assert(rev.status === 200 && rev.data.data.theo_thang.length === 12, 'Vendor revenue lỗi');
  });

  console.log(`\n=== KẾT QUẢ E2E: ${passed} PASS | ${failed} FAIL ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
