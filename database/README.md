# Cơ sở dữ liệu & Bộ trích xuất dữ liệu — StayWithUs (`hotel_booking_db`)

Thư mục này chứa toàn bộ cấu trúc CSDL PostgreSQL, dữ liệu thực tế đã trích xuất từ dự án **StayWithUs**, và các bản sao dữ liệu dạng **SQL / JSON / CSV** phục vụ triển khai sang máy mới, sao lưu hoặc nộp kèm luận văn tốt nghiệp.

## Cấu trúc thư mục

```text
database/
├── schema.sql                # Toàn bộ DDL: bảng, khóa chính, khóa ngoại, index và hàm cosine_similarity()
├── seed_data.sql             # Toàn bộ dữ liệu thực tế (INSERT theo đúng thứ tự FK + đồng bộ SEQUENCE)
├── exports/
│   ├── all_data.json         # File JSON tổng hợp toàn bộ bảng & thống kê số dòng
│   ├── json/                 # File JSON tách riêng từng bảng (<table>.json)
│   └── csv/                  # File CSV tách riêng từng bảng (UTF-8 BOM, mở trực tiếp bằng Excel)
└── README.md
```

## 1. Cách nạp CSDL sang máy mới (Import)

### Cách A — Dùng lệnh Node.js có sẵn (khuyên dùng, không cần cài `psql`)
1. Tạo sẵn database trống tên `hotel_booking_db` trong PostgreSQL (pgAdmin 4) và cấu hình `backend/.env`.
2. Chạy lệnh tại thư mục gốc dự án:
```bash
npm --prefix backend run db:import
```
*(Nếu muốn xóa sạch bảng cũ và tạo lại từ đầu, thêm cờ `--reset`: `npm --prefix backend run db:import -- --reset`)*

### Cách B — Dùng `psql` hoặc pgAdmin 4 Query Tool
Chạy lần lượt 2 file theo đúng thứ tự:
```bash
psql -U postgres -d hotel_booking_db -f database/schema.sql
psql -U postgres -d hotel_booking_db -f database/seed_data.sql
```

## 2. Cách xuất / cập nhật lại dữ liệu mới nhất từ PostgreSQL (Export)

Mỗi khi bạn thêm khách sạn, đơn đặt phòng, người dùng hoặc đánh giá mới trên website, chạy lại lệnh sau để cập nhật toàn bộ `schema.sql`, `seed_data.sql`, `JSON` và `CSV`:

```bash
npm --prefix backend run db:export
```
