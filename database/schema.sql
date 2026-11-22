-- ============================================================================
-- STAYWITHUS - SCHEMA CƠ SỞ DỮ LIỆU POSTGRESQL (hotel_booking_db)
-- Xuất tự động từ CSDL thực tế lúc: 2026-11-21T12:37:04.115Z
-- Tổng số bảng: 18 | Hàm tùy chỉnh: 1
-- ============================================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- Bảng: dia_diem
CREATE TABLE IF NOT EXISTS public.dia_diem (
  id_diadiem BIGSERIAL,
  tinh_thanh character varying(100) NOT NULL,
  quan_huyen character varying(100) NOT NULL,
  slug character varying(150) NOT NULL,
  CONSTRAINT dia_diem_pkey PRIMARY KEY (id_diadiem),
  CONSTRAINT dia_diem_slug_key UNIQUE (slug)
);

-- Bảng: su_kien_dac_quyen
CREATE TABLE IF NOT EXISTS public.su_kien_dac_quyen (
  id_sukien BIGSERIAL,
  tieu_de character varying(200) NOT NULL,
  mo_ta text NOT NULL,
  doi_tuong character varying(60) DEFAULT 'TAT_CA'::character varying NOT NULL,
  dac_quyen character varying(255) NOT NULL,
  ma_voucher_kem character varying(50),
  ngay_batdau timestamp with time zone NOT NULL,
  ngay_ketthuc timestamp with time zone NOT NULL,
  trang_thai character varying(30) DEFAULT 'DANG_DIEN_RA'::character varying NOT NULL,
  ngay_tao timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT su_kien_dac_quyen_check CHECK ((ngay_ketthuc > ngay_batdau)),
  CONSTRAINT su_kien_dac_quyen_pkey PRIMARY KEY (id_sukien)
);

-- Bảng: tien_ich
CREATE TABLE IF NOT EXISTS public.tien_ich (
  id_tienich BIGSERIAL,
  ten_tienich character varying(100) NOT NULL,
  loai_tienich character varying(50) NOT NULL,
  icon character varying(100),
  CONSTRAINT tien_ich_pkey PRIMARY KEY (id_tienich)
);

-- Bảng: vai_tro
CREATE TABLE IF NOT EXISTS public.vai_tro (
  id_vaitro BIGSERIAL,
  ten_vaitro character varying(50) NOT NULL,
  mo_ta_vaitro character varying(255),
  CONSTRAINT vai_tro_pkey PRIMARY KEY (id_vaitro),
  CONSTRAINT vai_tro_ten_vaitro_key UNIQUE (ten_vaitro)
);

-- Bảng: nguoi_dung
CREATE TABLE IF NOT EXISTS public.nguoi_dung (
  id_nguoidung BIGSERIAL,
  id_vaitro bigint NOT NULL,
  ho_ten character varying(100) NOT NULL,
  email character varying(150) NOT NULL,
  mat_khau character varying(255) NOT NULL,
  sdt character varying(20),
  avatar character varying(255),
  trang_thai_tk character varying(30) DEFAULT 'HOAT_DONG'::character varying NOT NULL,
  CONSTRAINT nguoi_dung_pkey PRIMARY KEY (id_nguoidung),
  CONSTRAINT nguoi_dung_email_key UNIQUE (email),
  CONSTRAINT nguoi_dung_sdt_key UNIQUE (sdt)
);

-- Bảng: ho_so_ncc
CREATE TABLE IF NOT EXISTS public.ho_so_ncc (
  id_ncc BIGSERIAL,
  id_nguoidung bigint NOT NULL,
  ten_doanh_nghiep character varying(150) NOT NULL,
  ma_so_thue character varying(50) NOT NULL,
  so_tai_khoan character varying(100) NOT NULL,
  ty_le_chiet_khau numeric(5,2) DEFAULT 10.00 NOT NULL,
  trang_thai_duyet character varying(30) DEFAULT 'CHO_DUYET'::character varying NOT NULL,
  CONSTRAINT ho_so_ncc_ty_le_chiet_khau_check CHECK (((ty_le_chiet_khau >= (0)::numeric) AND (ty_le_chiet_khau <= (100)::numeric))),
  CONSTRAINT ho_so_ncc_pkey PRIMARY KEY (id_ncc),
  CONSTRAINT ho_so_ncc_id_nguoidung_key UNIQUE (id_nguoidung),
  CONSTRAINT ho_so_ncc_ma_so_thue_key UNIQUE (ma_so_thue)
);

-- Bảng: khach_san
CREATE TABLE IF NOT EXISTS public.khach_san (
  id_khachsan BIGSERIAL,
  id_ncc bigint NOT NULL,
  id_diadiem bigint NOT NULL,
  ten_khachsan character varying(200) NOT NULL,
  dia_chi text NOT NULL,
  mo_ta text,
  hang_sao smallint,
  trang_thai_duyet character varying(30) DEFAULT 'CHO_DUYET'::character varying NOT NULL,
  embedding real[],
  CONSTRAINT khach_san_hang_sao_check CHECK (((hang_sao >= 1) AND (hang_sao <= 5))),
  CONSTRAINT khach_san_pkey PRIMARY KEY (id_khachsan)
);

-- Bảng: danh_gia
CREATE TABLE IF NOT EXISTS public.danh_gia (
  id_danhgia BIGSERIAL,
  id_nguoidung bigint NOT NULL,
  id_khachsan bigint NOT NULL,
  so_sao smallint NOT NULL,
  noi_dung text,
  phan_hoi_ncc text,
  trang_thai_duyet character varying(30) DEFAULT 'HIEN_THI'::character varying NOT NULL,
  CONSTRAINT danh_gia_so_sao_check CHECK (((so_sao >= 1) AND (so_sao <= 5))),
  CONSTRAINT danh_gia_pkey PRIMARY KEY (id_danhgia)
);

-- Bảng: dich_vu
CREATE TABLE IF NOT EXISTS public.dich_vu (
  id_dichvu BIGSERIAL,
  id_khachsan bigint NOT NULL,
  ten_dichvu character varying(150) NOT NULL,
  gia_dichvu numeric(12,2) NOT NULL,
  don_vi_tinh character varying(50) NOT NULL,
  CONSTRAINT dich_vu_gia_dichvu_check CHECK ((gia_dichvu >= (0)::numeric)),
  CONSTRAINT dich_vu_pkey PRIMARY KEY (id_dichvu)
);

-- Bảng: khach_san_tien_ich
CREATE TABLE IF NOT EXISTS public.khach_san_tien_ich (
  id_khachsan bigint NOT NULL,
  id_tienich bigint NOT NULL,
  CONSTRAINT khach_san_tien_ich_pkey PRIMARY KEY (id_khachsan, id_tienich)
);

-- Bảng: khuyen_mai
CREATE TABLE IF NOT EXISTS public.khuyen_mai (
  id_khuyenmai BIGSERIAL,
  ma_voucher character varying(50) NOT NULL,
  loai_giamgia character varying(30) NOT NULL,
  gia_tri_giam numeric(12,2) NOT NULL,
  ngay_batdau timestamp with time zone NOT NULL,
  ngay_ketthuc timestamp with time zone NOT NULL,
  id_khachsan bigint,
  CONSTRAINT khuyen_mai_check CHECK ((ngay_ketthuc > ngay_batdau)),
  CONSTRAINT khuyen_mai_gia_tri_giam_check CHECK ((gia_tri_giam > (0)::numeric)),
  CONSTRAINT khuyen_mai_pkey PRIMARY KEY (id_khuyenmai),
  CONSTRAINT khuyen_mai_ma_voucher_key UNIQUE (ma_voucher)
);

-- Bảng: don_dat_phong
CREATE TABLE IF NOT EXISTS public.don_dat_phong (
  id_dondat BIGSERIAL,
  id_nguoidung bigint NOT NULL,
  id_khachsan bigint NOT NULL,
  id_khuyenmai bigint,
  ngay_nhan_phong date NOT NULL,
  ngay_tra_phong date NOT NULL,
  tong_tien numeric(12,2) NOT NULL,
  phi_hoa_hong numeric(12,2) DEFAULT 0 NOT NULL,
  trang_thai_don character varying(30) DEFAULT 'CHO_XAC_NHAN'::character varying NOT NULL,
  CONSTRAINT don_dat_phong_check CHECK ((ngay_tra_phong > ngay_nhan_phong)),
  CONSTRAINT don_dat_phong_phi_hoa_hong_check CHECK ((phi_hoa_hong >= (0)::numeric)),
  CONSTRAINT don_dat_phong_tong_tien_check CHECK ((tong_tien >= (0)::numeric)),
  CONSTRAINT don_dat_phong_pkey PRIMARY KEY (id_dondat)
);

-- Bảng: chi_tiet_dich_vu
CREATE TABLE IF NOT EXISTS public.chi_tiet_dich_vu (
  id_dondat bigint NOT NULL,
  id_dichvu bigint NOT NULL,
  so_luong integer NOT NULL,
  don_gia numeric(12,2) NOT NULL,
  CONSTRAINT chi_tiet_dich_vu_don_gia_check CHECK ((don_gia >= (0)::numeric)),
  CONSTRAINT chi_tiet_dich_vu_so_luong_check CHECK ((so_luong > 0)),
  CONSTRAINT chi_tiet_dich_vu_pkey PRIMARY KEY (id_dondat, id_dichvu)
);

-- Bảng: loai_phong
CREATE TABLE IF NOT EXISTS public.loai_phong (
  id_loaiphong BIGSERIAL,
  id_khachsan bigint NOT NULL,
  ten_loaiphong character varying(150) NOT NULL,
  suc_chua integer NOT NULL,
  gia_moi_dem numeric(12,2) NOT NULL,
  dien_tich double precision,
  mo_ta_lp text,
  CONSTRAINT loai_phong_gia_moi_dem_check CHECK ((gia_moi_dem >= (0)::numeric)),
  CONSTRAINT loai_phong_suc_chua_check CHECK ((suc_chua > 0)),
  CONSTRAINT loai_phong_pkey PRIMARY KEY (id_loaiphong)
);

-- Bảng: phong
CREATE TABLE IF NOT EXISTS public.phong (
  id_phong BIGSERIAL,
  id_loaiphong bigint NOT NULL,
  so_phong character varying(20) NOT NULL,
  tang integer,
  trang_thai_phong character varying(30) DEFAULT 'TRONG'::character varying NOT NULL,
  ghi_chu character varying(255),
  CONSTRAINT phong_pkey PRIMARY KEY (id_phong)
);

-- Bảng: chi_tiet_dat_phong
CREATE TABLE IF NOT EXISTS public.chi_tiet_dat_phong (
  id_dondat bigint NOT NULL,
  id_phong bigint NOT NULL,
  don_gia numeric(12,2) NOT NULL,
  so_dem integer NOT NULL,
  thanh_tien numeric(12,2) NOT NULL,
  CONSTRAINT chi_tiet_dat_phong_don_gia_check CHECK ((don_gia >= (0)::numeric)),
  CONSTRAINT chi_tiet_dat_phong_so_dem_check CHECK ((so_dem > 0)),
  CONSTRAINT chi_tiet_dat_phong_thanh_tien_check CHECK ((thanh_tien >= (0)::numeric)),
  CONSTRAINT chi_tiet_dat_phong_pkey PRIMARY KEY (id_dondat, id_phong)
);

-- Bảng: thanh_toan
CREATE TABLE IF NOT EXISTS public.thanh_toan (
  id_thanhtoan BIGSERIAL,
  id_dondat bigint NOT NULL,
  phuong_thuc character varying(50) NOT NULL,
  so_tien numeric(12,2) NOT NULL,
  ma_giao_dich character varying(100),
  trang_thai_tt character varying(30) DEFAULT 'CHO_THANH_TOAN'::character varying NOT NULL,
  CONSTRAINT thanh_toan_so_tien_check CHECK ((so_tien >= (0)::numeric)),
  CONSTRAINT thanh_toan_pkey PRIMARY KEY (id_thanhtoan)
);

-- Bảng: hoa_don
CREATE TABLE IF NOT EXISTS public.hoa_don (
  id_hoadon BIGSERIAL,
  id_thanhtoan bigint NOT NULL,
  ma_so_thue character varying(50) NOT NULL,
  ten_cong_ty character varying(200) NOT NULL,
  email_nhan_hd character varying(150) NOT NULL,
  ngay_xuat timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT hoa_don_pkey PRIMARY KEY (id_hoadon),
  CONSTRAINT hoa_don_id_thanhtoan_key UNIQUE (id_thanhtoan)
);

-- ============================================================================
-- RÀNG BUỘC KHÓA NGOẠI (FOREIGN KEYS)
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chi_tiet_dat_phong_id_dondat_fkey') THEN
    ALTER TABLE public.chi_tiet_dat_phong ADD CONSTRAINT chi_tiet_dat_phong_id_dondat_fkey FOREIGN KEY (id_dondat) REFERENCES don_dat_phong(id_dondat) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chi_tiet_dat_phong_id_phong_fkey') THEN
    ALTER TABLE public.chi_tiet_dat_phong ADD CONSTRAINT chi_tiet_dat_phong_id_phong_fkey FOREIGN KEY (id_phong) REFERENCES phong(id_phong) ON DELETE RESTRICT;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chi_tiet_dich_vu_id_dichvu_fkey') THEN
    ALTER TABLE public.chi_tiet_dich_vu ADD CONSTRAINT chi_tiet_dich_vu_id_dichvu_fkey FOREIGN KEY (id_dichvu) REFERENCES dich_vu(id_dichvu) ON DELETE RESTRICT;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chi_tiet_dich_vu_id_dondat_fkey') THEN
    ALTER TABLE public.chi_tiet_dich_vu ADD CONSTRAINT chi_tiet_dich_vu_id_dondat_fkey FOREIGN KEY (id_dondat) REFERENCES don_dat_phong(id_dondat) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'danh_gia_id_khachsan_fkey') THEN
    ALTER TABLE public.danh_gia ADD CONSTRAINT danh_gia_id_khachsan_fkey FOREIGN KEY (id_khachsan) REFERENCES khach_san(id_khachsan) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'danh_gia_id_nguoidung_fkey') THEN
    ALTER TABLE public.danh_gia ADD CONSTRAINT danh_gia_id_nguoidung_fkey FOREIGN KEY (id_nguoidung) REFERENCES nguoi_dung(id_nguoidung) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dich_vu_id_khachsan_fkey') THEN
    ALTER TABLE public.dich_vu ADD CONSTRAINT dich_vu_id_khachsan_fkey FOREIGN KEY (id_khachsan) REFERENCES khach_san(id_khachsan) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'don_dat_phong_id_khachsan_fkey') THEN
    ALTER TABLE public.don_dat_phong ADD CONSTRAINT don_dat_phong_id_khachsan_fkey FOREIGN KEY (id_khachsan) REFERENCES khach_san(id_khachsan) ON DELETE RESTRICT;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'don_dat_phong_id_khuyenmai_fkey') THEN
    ALTER TABLE public.don_dat_phong ADD CONSTRAINT don_dat_phong_id_khuyenmai_fkey FOREIGN KEY (id_khuyenmai) REFERENCES khuyen_mai(id_khuyenmai) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'don_dat_phong_id_nguoidung_fkey') THEN
    ALTER TABLE public.don_dat_phong ADD CONSTRAINT don_dat_phong_id_nguoidung_fkey FOREIGN KEY (id_nguoidung) REFERENCES nguoi_dung(id_nguoidung) ON DELETE RESTRICT;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ho_so_ncc_id_nguoidung_fkey') THEN
    ALTER TABLE public.ho_so_ncc ADD CONSTRAINT ho_so_ncc_id_nguoidung_fkey FOREIGN KEY (id_nguoidung) REFERENCES nguoi_dung(id_nguoidung) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hoa_don_id_thanhtoan_fkey') THEN
    ALTER TABLE public.hoa_don ADD CONSTRAINT hoa_don_id_thanhtoan_fkey FOREIGN KEY (id_thanhtoan) REFERENCES thanh_toan(id_thanhtoan) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_san_id_diadiem_fkey') THEN
    ALTER TABLE public.khach_san ADD CONSTRAINT khach_san_id_diadiem_fkey FOREIGN KEY (id_diadiem) REFERENCES dia_diem(id_diadiem) ON DELETE RESTRICT;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_san_id_ncc_fkey') THEN
    ALTER TABLE public.khach_san ADD CONSTRAINT khach_san_id_ncc_fkey FOREIGN KEY (id_ncc) REFERENCES ho_so_ncc(id_ncc) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_san_tien_ich_id_khachsan_fkey') THEN
    ALTER TABLE public.khach_san_tien_ich ADD CONSTRAINT khach_san_tien_ich_id_khachsan_fkey FOREIGN KEY (id_khachsan) REFERENCES khach_san(id_khachsan) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_san_tien_ich_id_tienich_fkey') THEN
    ALTER TABLE public.khach_san_tien_ich ADD CONSTRAINT khach_san_tien_ich_id_tienich_fkey FOREIGN KEY (id_tienich) REFERENCES tien_ich(id_tienich) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khuyen_mai_id_khachsan_fkey') THEN
    ALTER TABLE public.khuyen_mai ADD CONSTRAINT khuyen_mai_id_khachsan_fkey FOREIGN KEY (id_khachsan) REFERENCES khach_san(id_khachsan) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loai_phong_id_khachsan_fkey') THEN
    ALTER TABLE public.loai_phong ADD CONSTRAINT loai_phong_id_khachsan_fkey FOREIGN KEY (id_khachsan) REFERENCES khach_san(id_khachsan) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nguoi_dung_id_vaitro_fkey') THEN
    ALTER TABLE public.nguoi_dung ADD CONSTRAINT nguoi_dung_id_vaitro_fkey FOREIGN KEY (id_vaitro) REFERENCES vai_tro(id_vaitro) ON DELETE RESTRICT;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phong_id_loaiphong_fkey') THEN
    ALTER TABLE public.phong ADD CONSTRAINT phong_id_loaiphong_fkey FOREIGN KEY (id_loaiphong) REFERENCES loai_phong(id_loaiphong) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'thanh_toan_id_dondat_fkey') THEN
    ALTER TABLE public.thanh_toan ADD CONSTRAINT thanh_toan_id_dondat_fkey FOREIGN KEY (id_dondat) REFERENCES don_dat_phong(id_dondat) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- HÀM TÙY CHỈNH (STORED FUNCTIONS - AI EMBEDDING COSINE SIMILARITY)
-- ============================================================================

-- Function: cosine_similarity
CREATE OR REPLACE FUNCTION public.cosine_similarity(a real[], b real[])
 RETURNS double precision
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    dot_product DOUBLE PRECISION := 0;
    norm_a DOUBLE PRECISION := 0;
    norm_b DOUBLE PRECISION := 0;
    i INT;
BEGIN
    IF a IS NULL OR b IS NULL OR array_length(a, 1) IS DISTINCT FROM array_length(b, 1) THEN
        RETURN 0;
    END IF;
    FOR i IN 1..array_length(a, 1) LOOP
        dot_product := dot_product + (a[i] * b[i]);
        norm_a := norm_a + (a[i] * a[i]);
        norm_b := norm_b + (b[i] * b[i]);
    END LOOP;
    IF norm_a = 0 OR norm_b = 0 THEN
        RETURN 0;
    END IF;
    RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
END;
$function$;
