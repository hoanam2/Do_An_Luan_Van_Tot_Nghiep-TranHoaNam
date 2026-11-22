const bcrypt = require('bcryptjs');
const db = require('../config/db');

const ROLES_SEED = [
  { ten_vaitro: 'USER', mo_ta_vaitro: 'Khách hàng đặt phòng và đánh giá' },
  { ten_vaitro: 'VENDOR', mo_ta_vaitro: 'Nhà cung cấp / Chủ khách sạn' },
  { ten_vaitro: 'ADMIN', mo_ta_vaitro: 'Quản trị viên hệ thống' },
];

const LOCATIONS_SEED = [
  { tinh_thanh: 'TP. Hồ Chí Minh', quan_huyen: 'Quận 1', slug: 'tp-ho-chi-minh-quan-1' },
  { tinh_thanh: 'TP. Hồ Chí Minh', quan_huyen: 'Quận 3', slug: 'tp-ho-chi-minh-quan-3' },
  { tinh_thanh: 'TP. Hồ Chí Minh', quan_huyen: 'TP. Thủ Đức', slug: 'tp-ho-chi-minh-thu-duc' },
  { tinh_thanh: 'Hà Nội', quan_huyen: 'Quận Hoàn Kiếm', slug: 'ha-noi-hoan-kiem' },
  { tinh_thanh: 'Hà Nội', quan_huyen: 'Quận Tây Hồ', slug: 'ha-noi-tay-ho' },
  { tinh_thanh: 'Đà Nẵng', quan_huyen: 'Quận Sơn Trà', slug: 'da-nang-son-tra' },
  { tinh_thanh: 'Đà Nẵng', quan_huyen: 'Quận Ngũ Hành Sơn', slug: 'da-nang-ngu-hanh-son' },
  { tinh_thanh: 'Lâm Đồng', quan_huyen: 'TP. Đà Lạt', slug: 'lam-dong-da-lat' },
  { tinh_thanh: 'Khánh Hòa', quan_huyen: 'TP. Nha Trang', slug: 'khanh-hoa-nha-trang' },
  { tinh_thanh: 'Kiên Giang', quan_huyen: 'TP. Phú Quốc', slug: 'kien-giang-phu-quoc' },
];

const AMENITIES_SEED = [
  { ten_tienich: 'Wi-Fi tốc độ cao miễn phí', loai_tienich: 'CO_BAN', icon: 'wifi' },
  { ten_tienich: 'Hồ bơi vô cực', loai_tienich: 'GIAI_TRI', icon: 'pool' },
  { ten_tienich: 'Bãi đỗ xe miễn phí', loai_tienich: 'CO_BAN', icon: 'parking' },
  { ten_tienich: 'Phòng tập Gym', loai_tienich: 'GIAI_TRI', icon: 'dumbbell' },
  { ten_tienich: 'Spa & Massage', loai_tienich: 'GIAI_TRI', icon: 'spa' },
  { ten_tienich: 'Nhà hàng buffet sáng', loai_tienich: 'AM_THUC', icon: 'utensils' },
  { ten_tienich: 'Quầy bar tầng thượng', loai_tienich: 'AM_THUC', icon: 'martini' },
  { ten_tienich: 'Đưa đón sân bay', loai_tienich: 'DI_CHUYEN', icon: 'plane' },
  { ten_tienich: 'Lễ tân 24/7', loai_tienich: 'CO_BAN', icon: 'clock' },
  { ten_tienich: 'Hướng biển', loai_tienich: 'KHONG_GIAN', icon: 'waves' },
  { ten_tienich: 'Phòng họp / Hội nghị', loai_tienich: 'CONG_TAC', icon: 'briefcase' },
  { ten_tienich: 'Cho phép thú cưng', loai_tienich: 'TIEN_NGHI', icon: 'paw' },
];

const runSeed = async () => {
  await db.withTransaction(async (client) => {
    // 1. Seed bảng vai_tro
    for (const role of ROLES_SEED) {
      await client.query(
        `INSERT INTO vai_tro (ten_vaitro, mo_ta_vaitro)
         SELECT $1::varchar, $2::varchar
         WHERE NOT EXISTS (SELECT 1 FROM vai_tro WHERE UPPER(ten_vaitro) = UPPER($1::varchar))`,
        [role.ten_vaitro, role.mo_ta_vaitro]
      );
    }

    // 2. Seed tài khoản Admin mặc định (admin@smarthotel.vn / Admin@123)
    const adminRoleRes = await client.query(
      `SELECT id_vaitro FROM vai_tro WHERE UPPER(ten_vaitro) = 'ADMIN' LIMIT 1`
    );
    if (adminRoleRes.rowCount > 0) {
      const adminEmail = 'admin@smarthotel.vn';
      const existingAdmin = await client.query(
        'SELECT id_nguoidung FROM nguoi_dung WHERE LOWER(email) = $1 LIMIT 1',
        [adminEmail]
      );
      if (existingAdmin.rowCount === 0) {
        const hashed = await bcrypt.hash('Admin@123', 10);
        await client.query(
          `INSERT INTO nguoi_dung (id_vaitro, ho_ten, email, mat_khau, sdt, trang_thai_tk)
           VALUES ($1, $2, $3, $4, $5, 'HOAT_DONG')`,
          [adminRoleRes.rows[0].id_vaitro, 'Quản trị viên hệ thống', adminEmail, hashed, '0900000001']
        );
        console.log('[Seed] Đã tạo tài khoản Admin mặc định: admin@smarthotel.vn / Admin@123');
      }
    }

    // 3. Seed bảng dia_diem
    for (const loc of LOCATIONS_SEED) {
      await client.query(
        `INSERT INTO dia_diem (tinh_thanh, quan_huyen, slug)
         SELECT $1::varchar, $2::varchar, $3::varchar
         WHERE NOT EXISTS (SELECT 1 FROM dia_diem WHERE slug = $3::varchar)`,
        [loc.tinh_thanh, loc.quan_huyen, loc.slug]
      );
    }

    // 4. Seed bảng tien_ich
    for (const item of AMENITIES_SEED) {
      await client.query(
        `INSERT INTO tien_ich (ten_tienich, loai_tienich, icon)
         SELECT $1::varchar, $2::varchar, $3::varchar
         WHERE NOT EXISTS (SELECT 1 FROM tien_ich WHERE LOWER(ten_tienich) = LOWER($1::varchar))`,
        [item.ten_tienich, item.loai_tienich, item.icon]
      );
    }

    // 5. Seed mã khuyến mãi mẫu (khuyen_mai)
    const vouchersSeed = [
      { ma_voucher: 'WELCOME10', loai_giamgia: 'PHAN_TRAM', gia_tri_giam: 10 },
      { ma_voucher: 'GIAM200K', loai_giamgia: 'SO_TIEN', gia_tri_giam: 200000 },
    ];
    for (const v of vouchersSeed) {
      await client.query(
        `INSERT INTO khuyen_mai (ma_voucher, loai_giamgia, gia_tri_giam, ngay_batdau, ngay_ketthuc)
         SELECT $1::varchar, $2::varchar, $3::numeric, NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days'
         WHERE NOT EXISTS (SELECT 1 FROM khuyen_mai WHERE UPPER(ma_voucher) = UPPER($1::varchar))`,
        [v.ma_voucher, v.loai_giamgia, v.gia_tri_giam]
      );
    }
  });

  console.log('[Seed] Hoàn tất khởi tạo dữ liệu nền (vai_tro, admin, dia_diem, tien_ich, khuyen_mai).');
};

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Seed] Lỗi:', err.message);
    process.exit(1);
  });
