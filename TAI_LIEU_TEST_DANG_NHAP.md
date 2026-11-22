# Tài Liệu Kiểm Thử Đăng Nhập & Phân Quyền — StayWithUs

Tài liệu hướng dẫn kiểm thử nhanh chức năng **Đăng ký OTP, Đăng nhập JWT và Phân quyền RBAC** cho đầy đủ 3 vai trò: **Khách hàng (`USER`)**, **Nhà cung cấp (`VENDOR`)** và **Quản trị viên (`ADMIN`)** trên cả giao diện Web và API.

---

## 1. Chuẩn bị môi trường trước khi test

Chạy lần lượt các lệnh sau (nếu chưa khởi tạo dữ liệu demo):

```powershell
# Terminal 1 — Khởi tạo dữ liệu & chạy Backend (http://localhost:5000)
cd backend
npm run seed
npm run migrate:ai
npm run seed:demo
npm run dev
```

```powershell
# Terminal 2 — Chạy Frontend (http://localhost:5173)
cd frontend
npm run dev
```

---

## 2. Danh sách tài khoản test mặc định

> Trên trang đăng nhập (`http://localhost:5173/login`), bạn có thể bấm trực tiếp 3 nút **Điền nhanh tài khoản Demo** (`Khách hàng`, `Vendor (NCC)`, `Admin`) để tiết kiệm thời gian.

| Vai trò | Họ tên / Đơn vị | Email | Mật khẩu | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Quản trị viên hệ thống | `admin@smarthotel.vn` | `Admin@123` | Toàn quyền duyệt NCC, duyệt khách sạn, đồng bộ AI, xem báo cáo toàn sàn |
| **VENDOR** | Nguyễn Minh Quân *(Ocean Hospitality)* | `vendor.danang@smarthotel.vn` | `Vendor@123` | Sở hữu 3 khách sạn (Đà Nẵng, TP.HCM, Phú Quốc), hồ sơ `DA_DUYET` |
| **VENDOR** | Trần Thảo Vy *(Highland Stays)* | `vendor.dalat@smarthotel.vn` | `Vendor@123` | Sở hữu 3 khách sạn (Đà Lạt, Hà Nội, Nha Trang), hồ sơ `DA_DUYET` |
| **USER** | Lê Hoàng Nam | `khach1@smarthotel.vn` | `User@123` | Đã có đơn `HOAN_THANH` & `DA_XAC_NHAN`, đã có hóa đơn VAT |
| **USER** | Phạm Ngọc Anh | `khach2@smarthotel.vn` | `User@123` | Đã có đơn `HOAN_THANH` tại Đà Lạt |

---

## 3. Kịch bản test trên giao diện Web (`http://localhost:5173`)

### Case 1: Đăng ký tài khoản mới + Xác thực OTP 6 số
1. Truy cập `http://localhost:5173/register` (hoặc bấm **Hợp tác với chúng tôi** trên Navbar để tự chọn sẵn vai trò `VENDOR`).
2. Nhập thông tin:
   - **Nếu chọn `USER`:** Họ tên, Email mới (VD: `testuser@gmail.com`), SĐT, Mật khẩu (≥ 6 ký tự).
   - **Nếu chọn `VENDOR`:** Nhập thêm `Tên doanh nghiệp`, `Mã số thuế`, `Số tài khoản ngân hàng`.
3. Bấm **Đăng ký & Nhận OTP** → hệ thống chuyển sang màn hình nhập mã OTP 6 số.
4. Lấy mã OTP 6 số:
   - Nếu đã cấu hình Gmail App Password trong `backend/.env`: kiểm tra hộp thư email vừa đăng ký.
   - Nếu đang để trống `SMTP_USER` / `SMTP_PASS`: xem trực tiếp mã OTP in ra ở **terminal chạy Backend**.
5. Nhập đúng mã OTP → bấm **Xác thực & Đăng nhập**.
6. **Kết quả kỳ vọng:** Tài khoản chuyển từ `CHO_XAC_THUC` sang `HOAT_DONG`, tự động đăng nhập và lưu JWT. Nếu là `VENDOR`, hồ sơ `ho_so_ncc` ở trạng thái `CHO_DUYET` chờ Admin phê duyệt.

---

### Case 2: Đăng nhập & Luồng Khách hàng (`USER`)
1. Vào `/login` → đăng nhập `khach1@smarthotel.vn` / `User@123`.
2. **Kiểm tra Navbar & điều hướng:**
   - Điều hướng về trang chủ `/`.
   - Thanh Navbar hiển thị `Lê Hoàng Nam · USER` và **không** hiển thị menu `Kênh NCC` hay `Quản trị`.
   - Thử nhập thẳng URL `/vendor` hoặc `/admin` trên trình duyệt → hệ thống tự động chặn và đẩy về `/`.
3. **Kiểm tra nghiệp vụ cốt lõi:**
   - Tại trang chủ: bấm **Sao chép** mã `WELCOME10` ở mục *Kho Voucher*.
   - Chọn 1 khách sạn → chọn ngày nhận/trả → chọn 1 phòng trống → mã `WELCOME10` được điền sẵn, bấm **Áp mã** → bấm **Đặt phòng ngay**.
   - Tại `/my-bookings`: bấm **Thanh toán** → chọn `VNPay QR` / `MoMo QR` / `Chuyển khoản` → kiểm tra khung **Mã QR** (có thể bấm **Tải ảnh QR** để thử ảnh QR thật) → bấm **Xác nhận đã thanh toán** → bấm **Hóa đơn VAT** để xuất hóa đơn.

---

### Case 3: Đăng nhập & Luồng Nhà cung cấp (`VENDOR`)
1. Đăng xuất tài khoản cũ → vào `/login` → đăng nhập `vendor.danang@smarthotel.vn` / `Vendor@123`.
2. **Kiểm tra Navbar & điều hướng:**
   - Tự động chuyển vào `/vendor` (**Kênh Nhà cung cấp**).
   - Navbar hiển thị menu **Kênh NCC**, **không** hiển thị menu **Quản trị**.
   - Thử truy cập trực tiếp `/admin` → bị đẩy về `/`.
3. **Kiểm tra nghiệp vụ cốt lõi:**
   - Xem 4 thẻ KPI (Khách sạn, Phòng, Doanh thu thực nhận sau hoa hồng, Điểm đánh giá) và biểu đồ doanh thu 12 tháng.
   - Bấm **+ Thêm khách sạn** để tạo 1 khách sạn mới → khách sạn hiển thị với trạng thái **Chờ duyệt**.
   - Tại bảng **Đơn đặt phòng tại khách sạn**: thử chuyển trạng thái đơn (`Xác nhận` → `Check-in` → `Hoàn thành`).

---

### Case 4: Đăng nhập & Luồng Quản trị viên (`ADMIN`)
1. Đăng xuất tài khoản cũ → vào `/login` → đăng nhập `admin@smarthotel.vn` / `Admin@123`.
2. **Kiểm tra Navbar & điều hướng:**
   - Tự động chuyển vào `/admin` (**Admin Dashboard**).
   - Navbar hiển thị đầy đủ cả **Kênh NCC** và **Quản trị**.
3. **Kiểm tra nghiệp vụ cốt lõi:**
   - Xem KPI tổng doanh thu sàn, tổng phí hoa hồng (`phi_hoa_hong`) và biểu đồ 12 tháng.
   - Tại bảng **Hồ sơ Nhà cung cấp**: bấm **Duyệt** cho Vendor mới đăng ký ở Case 1 (tự động nâng quyền thành `VENDOR`).
   - Tại bảng **Quản lý & Phê duyệt Khách sạn**: bấm **Duyệt** cho khách sạn mới tạo ở Case 3 (sẽ hiện ra ngoài trang chủ).
   - Bấm nút **Đồng bộ Vector AI** (yêu cầu đã điền `GEMINI_API_KEY` trong `backend/.env`) để sinh vector `REAL[]` cho tất cả khách sạn.

---

## 4. Các trường hợp kiểm thử lỗi & bảo mật (Negative Cases)

| STT | Kịch bản test | Kết quả kỳ vọng |
| :-: | :--- | :--- |
| 1 | Đăng nhập sai mật khẩu | Trả về `401` — *"Email hoặc mật khẩu không chính xác."* |
| 2 | Đăng nhập tài khoản vừa đăng ký nhưng **chưa nhập OTP** | Trả về `403` (`requireVerification: true`) — *"Tài khoản chưa được xác thực OTP."* |
| 3 | Nhập sai mã OTP hoặc mã quá hạn 10 phút | Trả về `400` — báo mã OTP không đúng/hết hạn (sai quá 5 lần tự hủy mã) |
| 4 | Bấm **Gửi lại mã OTP** liên tục dưới 60 giây | Trả về `429` — báo số giây cần chờ |
| 5 | Dùng token `USER` gọi `GET /api/auth/check/admin` hoặc `GET /api/reports/admin/overview` | Trả về `403 Forbidden` |
| 6 | Đặt 2 đơn trùng cùng `id_phong` và trùng ngày | Đơn thứ 2 bị chặn `409 Conflict` nhờ khóa `FOR UPDATE` |

---

## 5. Script PowerShell test nhanh đăng nhập & phân quyền API cả 3 vai trò

Mở PowerShell bất kỳ (khi Backend đang chạy tại `http://localhost:5000`) và copy chạy toàn bộ đoạn sau:

```powershell
$base = "http://localhost:5000/api"

function Test-Login($label, $email, $pass) {
  $body = @{ email = $email; mat_khau = $pass } | ConvertTo-Json
  $res = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body $body
  Write-Host "[$label] OK -> $($res.data.user.ho_ten) | Role: $($res.data.user.vai_tro)" -ForegroundColor Green
  return $res.data.token
}

$userToken   = Test-Login "USER"   "khach1@smarthotel.vn"        "User@123"
$vendorToken = Test-Login "VENDOR" "vendor.danang@smarthotel.vn" "Vendor@123"
$adminToken  = Test-Login "ADMIN"  "admin@smarthotel.vn"         "Admin@123"

# Kiểm tra phân quyền hợp lệ
Invoke-RestMethod "$base/auth/check/vendor-approved" -Headers @{ Authorization = "Bearer $vendorToken" } | Select-Object success, message
Invoke-RestMethod "$base/auth/check/admin"           -Headers @{ Authorization = "Bearer $adminToken" }  | Select-Object success, message

# Kiểm tra USER bị chặn vào route ADMIN (kỳ vọng 403)
try {
  Invoke-RestMethod "$base/auth/check/admin" -Headers @{ Authorization = "Bearer $userToken" }
} catch {
  Write-Host "[RBAC CHECK] USER bị chặn đúng như kỳ vọng: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Cyan
}
```

Hoặc chạy bộ kiểm thử tự động toàn bộ 16 test case của cả 4 giai đoạn:

```powershell
cd backend
npm run test:e2e
```
