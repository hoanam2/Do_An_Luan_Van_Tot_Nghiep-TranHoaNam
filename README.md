# StayWithUs — Nền tảng Đặt phòng Khách sạn Đa Nhà Cung Cấp tích hợp AI Semantic Search

> **Luận văn Tốt nghiệp** — Khoa Công Nghệ Thông Tin, Trường Đại học Công Nghệ Sài Gòn (2026)  
> **Sinh viên thực hiện:** Trần Hoa Nam (DH52201083)  
> **Giảng viên hướng dẫn:** ThS. Dương Văn Đeo

---

## Tổng quan tính năng
- **Khách hàng (`USER`):**
  - Đăng ký & xác thực OTP (ưu tiên SMS, dự phòng Email), đăng nhập JWT.
  - Tìm kiếm khách sạn bằng ngôn ngữ tự nhiên tiếng Việt tích hợp **Google Gemini AI** (NLP Intent + Vector Embedding `cosine_similarity` trong PostgreSQL, có fallback từ khóa).
  - Bộ lọc địa điểm, khoảng giá, hạng sao, tiện ích; xem chi tiết khách sạn & kiểm tra phòng trống theo ngày; AI tóm tắt đánh giá & Chatbot AI tư vấn 24/7.
  - Đặt phòng chống trùng lịch đồng thời (`SELECT ... FOR UPDATE`), áp mã Voucher, thanh toán trên trang riêng `/checkout` (MoMo, VNPAY, VietQR Sacombank, Tiền mặt, Thẻ), xuất hóa đơn điện tử VAT.
  - Quản lý lịch sử đặt phòng, hủy đơn và gửi đánh giá (chỉ mở sau khi hoàn tất lưu trú).
- **Nhà cung cấp (`VENDOR`):**
  - Đăng ký đối tác, quản lý khách sạn + đồng bộ AI Vector, loại phòng, phòng cụ thể & trạng thái phòng, dịch vụ đi kèm, voucher riêng, xử lý đơn (Xác nhận / Check-in / Hoàn thành), phản hồi đánh giá và biểu đồ doanh thu.
- **Quản trị viên (`ADMIN`):**
  - Quản lý hợp tác đối tác NCC (duyệt hồ sơ & cấu hình chiết khấu hoa hồng), duyệt niêm yết khách sạn, quản lý danh mục Địa điểm & Tiện ích, Voucher toàn sàn, Sự kiện đặc quyền, giám sát thanh toán & lịch sử khách hàng, khóa/mở khóa tài khoản và thống kê toàn sàn.

---

## Cấu trúc thư mục
```text
├── backend/                     # Node.js + Express + PostgreSQL + Gemini AI API
├── frontend/                    # React 18 + Vite SPA
├── database/                    # schema.sql, seed_data.sql, exports (JSON/CSV) & README
├── docs/                        # Tài liệu Phân tích & Thiết kế Hệ thống + hồ sơ Luận văn gốc
└── TAI_LIEU_TEST_DANG_NHAP.md   # Danh sách tài khoản test & kịch bản kiểm thử
```

---

## Hướng dẫn cài đặt & chạy nhanh

### 1. Cài đặt thư viện
```bash
npm --prefix backend install
npm --prefix frontend install
```

### 2. Cấu hình biến môi trường
- Tạo `backend/.env` từ `backend/.env.example` và điền `DB_PASSWORD`, `JWT_SECRET`, `GEMINI_API_KEY` (tùy chọn `SMTP_USER`/`SMTP_PASS`).
- Tạo `frontend/.env` từ `frontend/.env.example` (`VITE_API_URL=http://localhost:5000/api`).

### 3. Khởi tạo cơ sở dữ liệu PostgreSQL
Tạo database trống `hotel_booking_db` trong PostgreSQL rồi chạy:
```bash
npm --prefix backend run db:import
```

### 4. Khởi chạy Backend & Frontend
```bash
# Terminal 1 - Backend (http://localhost:5000)
npm --prefix backend run dev

# Terminal 2 - Frontend (http://localhost:5173)
npm --prefix frontend run dev
```

Xem chi tiết tài liệu hệ thống tại [docs/README.md](./docs/README.md) và hướng dẫn CSDL tại [database/README.md](./database/README.md).
