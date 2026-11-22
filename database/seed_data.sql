-- ============================================================================
-- STAYWITHUS - DỮ LIỆU THỰC TẾ TỪ POSTGRESQL (hotel_booking_db)
-- Xuất tự động lúc: 2026-11-21T12:37:04.115Z
-- Ghi chú: Chạy database/schema.sql trước khi nạp file này.
-- ============================================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

BEGIN;

-- Dữ liệu bảng dia_diem (10 dòng)
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (1, 'TP. Hồ Chí Minh', 'Quận 1', 'tp-ho-chi-minh-quan-1') ON CONFLICT DO NOTHING;
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (2, 'TP. Hồ Chí Minh', 'Quận 3', 'tp-ho-chi-minh-quan-3') ON CONFLICT DO NOTHING;
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (3, 'TP. Hồ Chí Minh', 'TP. Thủ Đức', 'tp-ho-chi-minh-thu-duc') ON CONFLICT DO NOTHING;
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (4, 'Hà Nội', 'Quận Hoàn Kiếm', 'ha-noi-hoan-kiem') ON CONFLICT DO NOTHING;
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (5, 'Hà Nội', 'Quận Tây Hồ', 'ha-noi-tay-ho') ON CONFLICT DO NOTHING;
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (6, 'Đà Nẵng', 'Quận Sơn Trà', 'da-nang-son-tra') ON CONFLICT DO NOTHING;
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (7, 'Đà Nẵng', 'Quận Ngũ Hành Sơn', 'da-nang-ngu-hanh-son') ON CONFLICT DO NOTHING;
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (8, 'Lâm Đồng', 'TP. Đà Lạt', 'lam-dong-da-lat') ON CONFLICT DO NOTHING;
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (9, 'Khánh Hòa', 'TP. Nha Trang', 'khanh-hoa-nha-trang') ON CONFLICT DO NOTHING;
INSERT INTO public.dia_diem (id_diadiem, tinh_thanh, quan_huyen, slug) VALUES (10, 'Kiên Giang', 'TP. Phú Quốc', 'kien-giang-phu-quoc') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng su_kien_dac_quyen (2 dòng)
INSERT INTO public.su_kien_dac_quyen (id_sukien, tieu_de, mo_ta, doi_tuong, dac_quyen, ma_voucher_kem, ngay_batdau, ngay_ketthuc, trang_thai, ngay_tao) VALUES (1, 'Đêm Hội Thành Viên StayWithUs', 'Ưu đãi độc quyền tặng mã giảm giá và miễn phí nhận phòng sớm cho khách hàng đăng nhập tài khoản StayWithUs.', 'THANH_VIEN', 'Giảm 10% tổng đơn + Ưu tiên nhận phòng sớm 2 giờ', 'WELCOME10', '2026-11-20T06:05:43.022Z', '2027-05-20T06:05:43.022Z', 'DANG_DIEN_RA', '2026-11-21T06:05:43.022Z') ON CONFLICT DO NOTHING;
INSERT INTO public.su_kien_dac_quyen (id_sukien, tieu_de, mo_ta, doi_tuong, dac_quyen, ma_voucher_kem, ngay_batdau, ngay_ketthuc, trang_thai, ngay_tao) VALUES (2, 'Tuần Lễ Nghỉ Dưỡng Biển Hè VIP', 'Sự kiện đặc quyền áp dụng cho các khu nghỉ dưỡng biển 4-5 sao tại Đà Nẵng, Phú Quốc và Nha Trang.', 'KHACH_VIP', 'Giảm trực tiếp 200.000đ + Miễn phí nâng hạng phòng nếu còn trống', 'GIAM200K', '2026-11-20T06:05:43.022Z', '2027-03-21T06:05:43.022Z', 'DANG_DIEN_RA', '2026-11-21T06:05:43.022Z') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng tien_ich (12 dòng)
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (1, 'Wi-Fi tốc độ cao miễn phí', 'CO_BAN', 'wifi') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (2, 'Hồ bơi vô cực', 'GIAI_TRI', 'pool') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (3, 'Bãi đỗ xe miễn phí', 'CO_BAN', 'parking') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (4, 'Phòng tập Gym', 'GIAI_TRI', 'dumbbell') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (5, 'Spa & Massage', 'GIAI_TRI', 'spa') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (6, 'Nhà hàng buffet sáng', 'AM_THUC', 'utensils') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (7, 'Quầy bar tầng thượng', 'AM_THUC', 'martini') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (8, 'Đưa đón sân bay', 'DI_CHUYEN', 'plane') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (9, 'Lễ tân 24/7', 'CO_BAN', 'clock') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (10, 'Hướng biển', 'KHONG_GIAN', 'waves') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (11, 'Phòng họp / Hội nghị', 'CONG_TAC', 'briefcase') ON CONFLICT DO NOTHING;
INSERT INTO public.tien_ich (id_tienich, ten_tienich, loai_tienich, icon) VALUES (12, 'Cho phép thú cưng', 'TIEN_NGHI', 'paw') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng vai_tro (3 dòng)
INSERT INTO public.vai_tro (id_vaitro, ten_vaitro, mo_ta_vaitro) VALUES (1, 'USER', 'Khách hàng đặt phòng và đánh giá') ON CONFLICT DO NOTHING;
INSERT INTO public.vai_tro (id_vaitro, ten_vaitro, mo_ta_vaitro) VALUES (2, 'VENDOR', 'Nhà cung cấp / Chủ khách sạn') ON CONFLICT DO NOTHING;
INSERT INTO public.vai_tro (id_vaitro, ten_vaitro, mo_ta_vaitro) VALUES (3, 'ADMIN', 'Quản trị viên hệ thống') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng nguoi_dung (8 dòng)
INSERT INTO public.nguoi_dung (id_nguoidung, id_vaitro, ho_ten, email, mat_khau, sdt, avatar, trang_thai_tk) VALUES (1, 3, 'Quản trị viên hệ thống', 'admin@smarthotel.vn', '$2a$10$CVSLimX5Ol9viecoq7ERZ.qjzZiM/yeKh0boPl3KjTDA4YjkCyVe6', '0900000001', NULL, 'HOAT_DONG') ON CONFLICT DO NOTHING;
INSERT INTO public.nguoi_dung (id_nguoidung, id_vaitro, ho_ten, email, mat_khau, sdt, avatar, trang_thai_tk) VALUES (2, 2, 'Nguyễn Minh Quân (Ocean Hospitality)', 'vendor.danang@smarthotel.vn', '$2a$10$13S6bf/aBMSe9kQu1u1OHuDAuRVqCXL0cPnLasF7wqkVJj.J1ZBde', '0905111222', NULL, 'HOAT_DONG') ON CONFLICT DO NOTHING;
INSERT INTO public.nguoi_dung (id_nguoidung, id_vaitro, ho_ten, email, mat_khau, sdt, avatar, trang_thai_tk) VALUES (3, 2, 'Trần Thảo Vy (Highland Stays)', 'vendor.dalat@smarthotel.vn', '$2a$10$501Sw45iJ.OGE1vosKU.FOB2iubVgzis3lV2TIltf4TZBBjGOIStC', '0908333444', NULL, 'HOAT_DONG') ON CONFLICT DO NOTHING;
INSERT INTO public.nguoi_dung (id_nguoidung, id_vaitro, ho_ten, email, mat_khau, sdt, avatar, trang_thai_tk) VALUES (4, 1, 'Lê Hoàng Nam', 'khach1@smarthotel.vn', '$2a$10$CRxDg7EENz15eldWVc72MO2ShgNF9AOLYj/lR27ghM1uoi0ORxEh.', '0912345678', NULL, 'HOAT_DONG') ON CONFLICT DO NOTHING;
INSERT INTO public.nguoi_dung (id_nguoidung, id_vaitro, ho_ten, email, mat_khau, sdt, avatar, trang_thai_tk) VALUES (5, 1, 'Phạm Ngọc Anh', 'khach2@smarthotel.vn', '$2a$10$3mBkHzZ9UcCp60Eo.PF6Kujnrh7DaoBtcuswO1LjoCuzYMYwPHNoW', '0987654321', NULL, 'HOAT_DONG') ON CONFLICT DO NOTHING;
INSERT INTO public.nguoi_dung (id_nguoidung, id_vaitro, ho_ten, email, mat_khau, sdt, avatar, trang_thai_tk) VALUES (7, 1, 'NamNam', 'hoanamtran68@gmail.com', '$2a$10$1GflSjSJs6FtI2SbyKxjXeWm/A/oBNOawv7aZQUwrr30EI05CxaW2', '0777106713', NULL, 'HOAT_DONG') ON CONFLICT DO NOTHING;
INSERT INTO public.nguoi_dung (id_nguoidung, id_vaitro, ho_ten, email, mat_khau, sdt, avatar, trang_thai_tk) VALUES (8, 1, 'duong', 'deo.duong@mailinator.com', '$2a$10$NWthjBTS6K6U.mvhIYpVe.b2GtYhcuEWr.c.fhAmPu.WYZHsmmRym', '0912356791', NULL, 'HOAT_DONG') ON CONFLICT DO NOTHING;
INSERT INTO public.nguoi_dung (id_nguoidung, id_vaitro, ho_ten, email, mat_khau, sdt, avatar, trang_thai_tk) VALUES (9, 1, 'duong', 'deo.duong1@mailinator.com', '$2a$10$s5an1mwBx5LNcL40dSWO.uMHMzXDV62bZdEDrTiIHi4FX5SM6nnQq', '0912356792', NULL, 'HOAT_DONG') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng ho_so_ncc (2 dòng)
INSERT INTO public.ho_so_ncc (id_ncc, id_nguoidung, ten_doanh_nghiep, ma_so_thue, so_tai_khoan, ty_le_chiet_khau, trang_thai_duyet) VALUES (1, 2, 'Tập đoàn Khách sạn Ocean Hospitality', '0401999888', 'VCB-0041000999888', 10.00, 'DA_DUYET') ON CONFLICT DO NOTHING;
INSERT INTO public.ho_so_ncc (id_ncc, id_nguoidung, ten_doanh_nghiep, ma_so_thue, so_tai_khoan, ty_le_chiet_khau, trang_thai_duyet) VALUES (2, 3, 'Công ty Nghỉ dưỡng Highland Stays', '5801777666', 'TCB-1903666777888', 12.00, 'DA_DUYET') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng khach_san (6 dòng)
INSERT INTO public.khach_san (id_khachsan, id_ncc, id_diadiem, ten_khachsan, dia_chi, mo_ta, hang_sao, trang_thai_duyet, embedding) VALUES (1, 1, 6, 'Grand Ocean Bay Resort & Spa', '88 Võ Nguyên Giáp, Quận Sơn Trà, Đà Nẵng', 'Khu nghỉ dưỡng 5 sao sang trọng nằm trực diện bãi biển Mỹ Khê với hồ bơi vô cực hướng biển, spa cao cấp và nhà hàng buffet quốc tế. Lý tưởng cho cặp đôi nghỉ dưỡng và gia đình.', 5, 'DA_DUYET', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san (id_khachsan, id_ncc, id_diadiem, ten_khachsan, dia_chi, mo_ta, hang_sao, trang_thai_duyet, embedding) VALUES (2, 1, 1, 'Saigon Central Boutique Hotel', '125 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh', 'Khách sạn 4 sao phong cách hiện đại ngay trung tâm Quận 1, cách chợ Bến Thành 3 phút đi bộ. Có phòng họp chuyên nghiệp, quầy bar tầng thượng ngắm toàn cảnh thành phố.', 4, 'DA_DUYET', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san (id_khachsan, id_ncc, id_diadiem, ten_khachsan, dia_chi, mo_ta, hang_sao, trang_thai_duyet, embedding) VALUES (3, 2, 8, 'Pine Hill Mist Villa Đà Lạt', '18 Đường Trần Hưng Đạo, TP. Đà Lạt, Lâm Đồng', 'Biệt thự nghỉ dưỡng 4 sao ẩn mình giữa rừng thông yên tĩnh, không khí se lạnh, thiết kế gỗ ấm cúng lãng mạn cực kỳ phù hợp cho cặp đôi, gia đình nhỏ và thân thiện với thú cưng.', 4, 'DA_DUYET', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san (id_khachsan, id_ncc, id_diadiem, ten_khachsan, dia_chi, mo_ta, hang_sao, trang_thai_duyet, embedding) VALUES (4, 1, 10, 'Emerald Pearl Phú Quốc Resort', 'Bãi Trường, Dương Tơ, TP. Phú Quốc, Kiên Giang', 'Thiên đường nghỉ dưỡng 5 sao bên bờ biển Phú Quốc với bãi cát trắng riêng, hồ bơi vô cực ngắm hoàng hôn tuyệt đẹp, spa thảo mộc và khu vui chơi trẻ em.', 5, 'DA_DUYET', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san (id_khachsan, id_ncc, id_diadiem, ten_khachsan, dia_chi, mo_ta, hang_sao, trang_thai_duyet, embedding) VALUES (5, 2, 4, 'Hanoi Old Quarter Heritage Hotel', '42 Hàng Bè, Quận Hoàn Kiếm, Hà Nội', 'Khách sạn 4 sao mang phong cách Đông Dương tinh tế giữa lòng phố cổ Hà Nội, cách Hồ Hoàn Kiếm chỉ 200m, thuận tiện khám phá ẩm thực và văn hóa thủ đô.', 4, 'DA_DUYET', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san (id_khachsan, id_ncc, id_diadiem, ten_khachsan, dia_chi, mo_ta, hang_sao, trang_thai_duyet, embedding) VALUES (6, 2, 9, 'Sunrise Beachfront Nha Trang', '64 Trần Phú, TP. Nha Trang, Khánh Hòa', 'Khách sạn 3 sao giá tốt ngay mặt tiền đường biển Trần Phú, phòng sạch sẽ sáng sủa, có hồ bơi ngoài trời và nhân viên thân thiện. Phù hợp du lịch tiết kiệm cùng bạn bè, gia đình.', 3, 'DA_DUYET', NULL) ON CONFLICT DO NOTHING;

-- Dữ liệu bảng danh_gia (4 dòng)
INSERT INTO public.danh_gia (id_danhgia, id_nguoidung, id_khachsan, so_sao, noi_dung, phan_hoi_ncc, trang_thai_duyet) VALUES (1, 4, 1, 5, 'Resort quá tuyệt vời! Hồ bơi vô cực nhìn thẳng ra biển Mỹ Khê, phòng sạch sẽ, nhân viên nhiệt tình và buffet sáng rất phong phú.', 'Grand Ocean Bay xin cảm ơn anh Nam đã dành lời khen. Rất mong được đón tiếp anh trong chuyến đi sắp tới!', 'HIEN_THI') ON CONFLICT DO NOTHING;
INSERT INTO public.danh_gia (id_danhgia, id_nguoidung, id_khachsan, so_sao, noi_dung, phan_hoi_ncc, trang_thai_duyet) VALUES (2, 5, 1, 4, 'Phòng đẹp, view biển rất thư giãn, spa làm tốt. Tuy nhiên giờ cao điểm thang máy hơi đông một chút.', NULL, 'HIEN_THI') ON CONFLICT DO NOTHING;
INSERT INTO public.danh_gia (id_danhgia, id_nguoidung, id_khachsan, so_sao, noi_dung, phan_hoi_ncc, trang_thai_duyet) VALUES (3, 5, 3, 5, 'Không gian rừng thông siêu chill và yên tĩnh, buổi sáng mở ban công ngắm mây cực thích. Rất hợp đi nghỉ dưỡng cùng người yêu.', 'Cảm ơn chị Ngọc Anh đã ghé thăm Pine Hill Mist Villa Đà Lạt ạ!', 'HIEN_THI') ON CONFLICT DO NOTHING;
INSERT INTO public.danh_gia (id_danhgia, id_nguoidung, id_khachsan, so_sao, noi_dung, phan_hoi_ncc, trang_thai_duyet) VALUES (4, 4, 2, 5, 'Vị trí ngay trung tâm Quận 1 đi công tác rất tiện lợi, Wi-Fi mạnh và quầy bar tầng thượng có view đẹp.', NULL, 'HIEN_THI') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng dich_vu (13 dòng)
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (1, 1, 'Đưa đón sân bay Đà Nẵng', 350000.00, 'Lượt') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (2, 1, 'Liệu trình Spa thư giãn 60 phút', 650000.00, 'Suất') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (3, 1, 'Buffet hải sản tối', 590000.00, 'Khách') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (4, 2, 'Giặt ủi nhanh trong ngày', 150000.00, 'Kg') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (5, 2, 'Đưa đón sân bay Tân Sơn Nhất', 300000.00, 'Lượt') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (6, 3, 'Set tiệc BBQ sân vườn (2-4 người)', 850000.00, 'Set') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (7, 3, 'Thuê xe máy khám phá Đà Lạt', 150000.00, 'Ngày') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (8, 4, 'Tour cano 4 đảo Phú Quốc', 950000.00, 'Khách') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (9, 4, 'Đưa đón sân bay Phú Quốc', 250000.00, 'Lượt') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (10, 5, 'Đưa đón sân bay Nội Bài', 400000.00, 'Lượt') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (11, 5, 'City Tour Hà Nội nửa ngày', 550000.00, 'Khách') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (12, 6, 'Thuê xe máy Nha Trang', 130000.00, 'Ngày') ON CONFLICT DO NOTHING;
INSERT INTO public.dich_vu (id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh) VALUES (13, 6, 'Ăn sáng tự chọn', 120000.00, 'Khách') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng khach_san_tien_ich (36 dòng)
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (1, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (1, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (1, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (1, 6) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (1, 8) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (1, 9) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (1, 10) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (2, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (2, 4) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (2, 6) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (2, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (2, 9) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (2, 11) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (3, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (3, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (3, 6) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (3, 9) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (3, 12) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (4, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (4, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (4, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (4, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (4, 6) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (4, 7) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (4, 8) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (4, 10) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (5, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (5, 5) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (5, 6) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (5, 8) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (5, 9) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (6, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (6, 2) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (6, 3) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (6, 9) ON CONFLICT DO NOTHING;
INSERT INTO public.khach_san_tien_ich (id_khachsan, id_tienich) VALUES (6, 10) ON CONFLICT DO NOTHING;

-- Dữ liệu bảng khuyen_mai (2 dòng)
INSERT INTO public.khuyen_mai (id_khuyenmai, ma_voucher, loai_giamgia, gia_tri_giam, ngay_batdau, ngay_ketthuc, id_khachsan) VALUES (1, 'WELCOME10', 'PHAN_TRAM', 10.00, '2026-11-19T17:37:57.816Z', '2027-11-20T17:37:57.816Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.khuyen_mai (id_khuyenmai, ma_voucher, loai_giamgia, gia_tri_giam, ngay_batdau, ngay_ketthuc, id_khachsan) VALUES (2, 'GIAM200K', 'SO_TIEN', 200000.00, '2026-11-19T17:37:57.816Z', '2027-11-20T17:37:57.816Z', NULL) ON CONFLICT DO NOTHING;

-- Dữ liệu bảng don_dat_phong (5 dòng)
INSERT INTO public.don_dat_phong (id_dondat, id_nguoidung, id_khachsan, id_khuyenmai, ngay_nhan_phong, ngay_tra_phong, tong_tien, phi_hoa_hong, trang_thai_don) VALUES (1, 4, 1, NULL, '2026-08-10', '2026-08-12', 4050000.00, 405000.00, 'HOAN_THANH') ON CONFLICT DO NOTHING;
INSERT INTO public.don_dat_phong (id_dondat, id_nguoidung, id_khachsan, id_khuyenmai, ngay_nhan_phong, ngay_tra_phong, tong_tien, phi_hoa_hong, trang_thai_don) VALUES (2, 5, 3, NULL, '2026-09-15', '2026-09-18', 3300000.00, 396000.00, 'HOAN_THANH') ON CONFLICT DO NOTHING;
INSERT INTO public.don_dat_phong (id_dondat, id_nguoidung, id_khachsan, id_khuyenmai, ngay_nhan_phong, ngay_tra_phong, tong_tien, phi_hoa_hong, trang_thai_don) VALUES (3, 4, 2, NULL, '2026-10-05', '2026-10-07', 2500000.00, 250000.00, 'DA_XAC_NHAN') ON CONFLICT DO NOTHING;
INSERT INTO public.don_dat_phong (id_dondat, id_nguoidung, id_khachsan, id_khuyenmai, ngay_nhan_phong, ngay_tra_phong, tong_tien, phi_hoa_hong, trang_thai_don) VALUES (4, 7, 3, NULL, '2026-11-24', '2026-11-26', 2200000.00, 264000.00, 'DA_HUY') ON CONFLICT DO NOTHING;
INSERT INTO public.don_dat_phong (id_dondat, id_nguoidung, id_khachsan, id_khuyenmai, ngay_nhan_phong, ngay_tra_phong, tong_tien, phi_hoa_hong, trang_thai_don) VALUES (5, 9, 3, NULL, '2026-11-10', '2026-11-21', 25850000.00, 3102000.00, 'CHO_XAC_NHAN') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng chi_tiet_dich_vu (1 dòng)
INSERT INTO public.chi_tiet_dich_vu (id_dondat, id_dichvu, so_luong, don_gia) VALUES (1, 1, 1, 350000.00) ON CONFLICT DO NOTHING;

-- Dữ liệu bảng loai_phong (11 dòng)
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (1, 1, 'Deluxe Ocean View', 2, 1850000.00, 42, 'Ban công riêng hướng biển Mỹ Khê, giường King, bồn tắm nằm.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (2, 1, 'Executive Family Suite', 4, 3400000.00, 75, '2 phòng ngủ rộng rãi, phòng khách riêng, miễn phí buffet sáng 4 khách.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (3, 2, 'Superior City View', 2, 1250000.00, 28, 'Phòng tiêu chuẩn đầy đủ tiện nghi công tác, bàn làm việc rộng.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (4, 2, 'Premier Executive', 2, 1950000.00, 40, 'Tầng cao nhìn ra trung tâm thành phố, tặng kèm đồ uống tầng thượng.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (5, 3, 'Forest Balcony Twin', 2, 1100000.00, 32, 'Ban công ngắm đồi thông săn mây buổi sáng, máy sưởi ấm áp.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (6, 3, 'Romantic Pine Villa', 4, 2350000.00, 65, 'Nguyên căn riêng tư có lò sưởi và sân vườn BBQ ngoài trời.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (7, 4, 'Ocean Sunset Bungalow', 2, 2650000.00, 50, 'Bungalow sát biển riêng tư, ngắm hoàng hôn trực diện.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (8, 4, 'Pool Villa 2 Phòng Ngủ', 4, 4500000.00, 110, 'Hồ bơi riêng trong khuôn viên villa, dịch vụ quản gia 24/7.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (9, 5, 'Heritage Deluxe', 2, 1350000.00, 30, 'Nội thất Indochine sang trọng, cửa sổ nhìn ra phố cổ.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (10, 6, 'Standard Sea Breeze', 2, 690000.00, 25, 'Phòng gọn gàng thoáng mát, cách bãi biển 1 phút băng qua đường.') ON CONFLICT DO NOTHING;
INSERT INTO public.loai_phong (id_loaiphong, id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp) VALUES (11, 6, 'Family Quad Ocean', 4, 1150000.00, 40, '2 giường lớn cho nhóm bạn hoặc gia đình 4 người.') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng phong (28 dòng)
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (1, 1, '301', 3, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (2, 1, '302', 3, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (3, 1, '303', 3, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (4, 2, '501', 5, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (5, 2, '502', 5, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (6, 3, '201', 2, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (7, 3, '202', 2, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (8, 3, '203', 2, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (9, 4, '601', 6, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (10, 4, '602', 6, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (11, 5, '101', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (12, 5, '102', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (13, 5, '103', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (14, 6, 'V01', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (15, 6, 'V02', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (16, 7, 'B01', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (17, 7, 'B02', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (18, 7, 'B03', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (19, 8, 'PV01', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (20, 8, 'PV02', 1, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (21, 9, '401', 4, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (22, 9, '402', 4, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (23, 9, '403', 4, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (24, 10, '201', 2, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (25, 10, '202', 2, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (26, 10, '203', 2, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (27, 11, '301', 3, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;
INSERT INTO public.phong (id_phong, id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu) VALUES (28, 11, '302', 3, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng chi_tiet_dat_phong (5 dòng)
INSERT INTO public.chi_tiet_dat_phong (id_dondat, id_phong, don_gia, so_dem, thanh_tien) VALUES (1, 1, 1850000.00, 2, 3700000.00) ON CONFLICT DO NOTHING;
INSERT INTO public.chi_tiet_dat_phong (id_dondat, id_phong, don_gia, so_dem, thanh_tien) VALUES (2, 11, 1100000.00, 3, 3300000.00) ON CONFLICT DO NOTHING;
INSERT INTO public.chi_tiet_dat_phong (id_dondat, id_phong, don_gia, so_dem, thanh_tien) VALUES (3, 6, 1250000.00, 2, 2500000.00) ON CONFLICT DO NOTHING;
INSERT INTO public.chi_tiet_dat_phong (id_dondat, id_phong, don_gia, so_dem, thanh_tien) VALUES (4, 12, 1100000.00, 2, 2200000.00) ON CONFLICT DO NOTHING;
INSERT INTO public.chi_tiet_dat_phong (id_dondat, id_phong, don_gia, so_dem, thanh_tien) VALUES (5, 14, 2350000.00, 11, 25850000.00) ON CONFLICT DO NOTHING;

-- Dữ liệu bảng thanh_toan (6 dòng)
INSERT INTO public.thanh_toan (id_thanhtoan, id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt) VALUES (1, 1, 'VNPAY', 4050000.00, 'VNPA-DEMO-20260810', 'DA_THANH_TOAN') ON CONFLICT DO NOTHING;
INSERT INTO public.thanh_toan (id_thanhtoan, id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt) VALUES (2, 2, 'MOMO', 3300000.00, 'MOMO-DEMO-20260915', 'DA_THANH_TOAN') ON CONFLICT DO NOTHING;
INSERT INTO public.thanh_toan (id_thanhtoan, id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt) VALUES (3, 3, 'CHUYEN_KHOAN', 2500000.00, 'CHUY-DEMO-20261005', 'DA_THANH_TOAN') ON CONFLICT DO NOTHING;
INSERT INTO public.thanh_toan (id_thanhtoan, id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt) VALUES (4, 4, 'VNPAY', 2200000.00, 'VNPA-1795239081456-D76D92', 'DA_THANH_TOAN') ON CONFLICT DO NOTHING;
INSERT INTO public.thanh_toan (id_thanhtoan, id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt) VALUES (5, 5, 'TIEN_MAT', 25850000.00, 'TIEN-1795243759710-00084C', 'CHO_THANH_TOAN') ON CONFLICT DO NOTHING;
INSERT INTO public.thanh_toan (id_thanhtoan, id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt) VALUES (6, 5, 'TIEN_MAT', 25850000.00, 'TIEN-1795243770807-D32385', 'CHO_THANH_TOAN') ON CONFLICT DO NOTHING;

-- Dữ liệu bảng hoa_don (1 dòng)
INSERT INTO public.hoa_don (id_hoadon, id_thanhtoan, ma_so_thue, ten_cong_ty, email_nhan_hd, ngay_xuat) VALUES (1, 1, '0316888999', 'Công ty TNHH Công Nghệ Phương Nam', 'ketoan@phuongnam.vn', '2026-11-20T17:52:23.666Z') ON CONFLICT DO NOTHING;

-- Đồng bộ lại bộ đếm SEQUENCE (tránh trùng khóa chính khi thêm dữ liệu mới)
SELECT setval(pg_get_serial_sequence('public.dia_diem', 'id_diadiem'), COALESCE((SELECT MAX(id_diadiem) FROM public.dia_diem), 1), (SELECT COUNT(*) > 0 FROM public.dia_diem));
SELECT setval(pg_get_serial_sequence('public.su_kien_dac_quyen', 'id_sukien'), COALESCE((SELECT MAX(id_sukien) FROM public.su_kien_dac_quyen), 1), (SELECT COUNT(*) > 0 FROM public.su_kien_dac_quyen));
SELECT setval(pg_get_serial_sequence('public.tien_ich', 'id_tienich'), COALESCE((SELECT MAX(id_tienich) FROM public.tien_ich), 1), (SELECT COUNT(*) > 0 FROM public.tien_ich));
SELECT setval(pg_get_serial_sequence('public.vai_tro', 'id_vaitro'), COALESCE((SELECT MAX(id_vaitro) FROM public.vai_tro), 1), (SELECT COUNT(*) > 0 FROM public.vai_tro));
SELECT setval(pg_get_serial_sequence('public.nguoi_dung', 'id_nguoidung'), COALESCE((SELECT MAX(id_nguoidung) FROM public.nguoi_dung), 1), (SELECT COUNT(*) > 0 FROM public.nguoi_dung));
SELECT setval(pg_get_serial_sequence('public.ho_so_ncc', 'id_ncc'), COALESCE((SELECT MAX(id_ncc) FROM public.ho_so_ncc), 1), (SELECT COUNT(*) > 0 FROM public.ho_so_ncc));
SELECT setval(pg_get_serial_sequence('public.khach_san', 'id_khachsan'), COALESCE((SELECT MAX(id_khachsan) FROM public.khach_san), 1), (SELECT COUNT(*) > 0 FROM public.khach_san));
SELECT setval(pg_get_serial_sequence('public.danh_gia', 'id_danhgia'), COALESCE((SELECT MAX(id_danhgia) FROM public.danh_gia), 1), (SELECT COUNT(*) > 0 FROM public.danh_gia));
SELECT setval(pg_get_serial_sequence('public.dich_vu', 'id_dichvu'), COALESCE((SELECT MAX(id_dichvu) FROM public.dich_vu), 1), (SELECT COUNT(*) > 0 FROM public.dich_vu));
SELECT setval(pg_get_serial_sequence('public.khuyen_mai', 'id_khuyenmai'), COALESCE((SELECT MAX(id_khuyenmai) FROM public.khuyen_mai), 1), (SELECT COUNT(*) > 0 FROM public.khuyen_mai));
SELECT setval(pg_get_serial_sequence('public.don_dat_phong', 'id_dondat'), COALESCE((SELECT MAX(id_dondat) FROM public.don_dat_phong), 1), (SELECT COUNT(*) > 0 FROM public.don_dat_phong));
SELECT setval(pg_get_serial_sequence('public.loai_phong', 'id_loaiphong'), COALESCE((SELECT MAX(id_loaiphong) FROM public.loai_phong), 1), (SELECT COUNT(*) > 0 FROM public.loai_phong));
SELECT setval(pg_get_serial_sequence('public.phong', 'id_phong'), COALESCE((SELECT MAX(id_phong) FROM public.phong), 1), (SELECT COUNT(*) > 0 FROM public.phong));
SELECT setval(pg_get_serial_sequence('public.thanh_toan', 'id_thanhtoan'), COALESCE((SELECT MAX(id_thanhtoan) FROM public.thanh_toan), 1), (SELECT COUNT(*) > 0 FROM public.thanh_toan));
SELECT setval(pg_get_serial_sequence('public.hoa_don', 'id_hoadon'), COALESCE((SELECT MAX(id_hoadon) FROM public.hoa_don), 1), (SELECT COUNT(*) > 0 FROM public.hoa_don));

COMMIT;
