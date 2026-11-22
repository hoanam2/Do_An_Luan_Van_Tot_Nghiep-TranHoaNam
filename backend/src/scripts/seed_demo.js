const bcrypt = require('bcryptjs');
const db = require('../config/db');

/**
 * Script khởi tạo dữ liệu demo đầy đủ cho cả 17 bảng để test & bảo vệ luận văn:
 * - 2 Vendor đã duyệt (vendor.danang@smarthotel.vn, vendor.dalat@smarthotel.vn / pass: Vendor@123)
 * - 2 Khách hàng (khach1@smarthotel.vn, khach2@smarthotel.vn / pass: User@123)
 * - 6 Khách sạn đã duyệt trên 6 tỉnh thành + tiện ích + loại phòng + phòng + dịch vụ
 * - 3 Đơn đặt phòng (HOAN_THANH, DA_XAC_NHAN, CHO_XAC_NHAN) + thanh toán + hóa đơn VAT + đánh giá & phản hồi NCC
 */

const DEMO_HOTELS = [
  {
    vendorEmail: 'vendor.danang@smarthotel.vn',
    locationSlug: 'da-nang-son-tra',
    ten_khachsan: 'Grand Ocean Bay Resort & Spa',
    dia_chi: '88 Võ Nguyên Giáp, Quận Sơn Trà, Đà Nẵng',
    mo_ta:
      'Khu nghỉ dưỡng 5 sao sang trọng nằm trực diện bãi biển Mỹ Khê với hồ bơi vô cực hướng biển, spa cao cấp và nhà hàng buffet quốc tế. Lý tưởng cho cặp đôi nghỉ dưỡng và gia đình.',
    hang_sao: 5,
    amenities: [
      'Wi-Fi tốc độ cao miễn phí',
      'Hồ bơi vô cực',
      'Spa & Massage',
      'Nhà hàng buffet sáng',
      'Đưa đón sân bay',
      'Hướng biển',
      'Lễ tân 24/7',
    ],
    roomTypes: [
      {
        ten_loaiphong: 'Deluxe Ocean View',
        suc_chua: 2,
        gia_moi_dem: 1850000,
        dien_tich: 42,
        mo_ta_lp: 'Ban công riêng hướng biển Mỹ Khê, giường King, bồn tắm nằm.',
        rooms: ['301', '302', '303'],
      },
      {
        ten_loaiphong: 'Executive Family Suite',
        suc_chua: 4,
        gia_moi_dem: 3400000,
        dien_tich: 75,
        mo_ta_lp: '2 phòng ngủ rộng rãi, phòng khách riêng, miễn phí buffet sáng 4 khách.',
        rooms: ['501', '502'],
      },
    ],
    services: [
      { ten_dichvu: 'Đưa đón sân bay Đà Nẵng', gia_dichvu: 350000, don_vi_tinh: 'Lượt' },
      { ten_dichvu: 'Liệu trình Spa thư giãn 60 phút', gia_dichvu: 650000, don_vi_tinh: 'Suất' },
      { ten_dichvu: 'Buffet hải sản tối', gia_dichvu: 590000, don_vi_tinh: 'Khách' },
    ],
  },
  {
    vendorEmail: 'vendor.danang@smarthotel.vn',
    locationSlug: 'tp-ho-chi-minh-quan-1',
    ten_khachsan: 'Saigon Central Boutique Hotel',
    dia_chi: '125 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    mo_ta:
      'Khách sạn 4 sao phong cách hiện đại ngay trung tâm Quận 1, cách chợ Bến Thành 3 phút đi bộ. Có phòng họp chuyên nghiệp, quầy bar tầng thượng ngắm toàn cảnh thành phố.',
    hang_sao: 4,
    amenities: [
      'Wi-Fi tốc độ cao miễn phí',
      'Phòng tập Gym',
      'Nhà hàng buffet sáng',
      'Quầy bar tầng thượng',
      'Lễ tân 24/7',
      'Phòng họp / Hội nghị',
    ],
    roomTypes: [
      {
        ten_loaiphong: 'Superior City View',
        suc_chua: 2,
        gia_moi_dem: 1250000,
        dien_tich: 28,
        mo_ta_lp: 'Phòng tiêu chuẩn đầy đủ tiện nghi công tác, bàn làm việc rộng.',
        rooms: ['201', '202', '203'],
      },
      {
        ten_loaiphong: 'Premier Executive',
        suc_chua: 2,
        gia_moi_dem: 1950000,
        dien_tich: 40,
        mo_ta_lp: 'Tầng cao nhìn ra trung tâm thành phố, tặng kèm đồ uống tầng thượng.',
        rooms: ['601', '602'],
      },
    ],
    services: [
      { ten_dichvu: 'Giặt ủi nhanh trong ngày', gia_dichvu: 150000, don_vi_tinh: 'Kg' },
      { ten_dichvu: 'Đưa đón sân bay Tân Sơn Nhất', gia_dichvu: 300000, don_vi_tinh: 'Lượt' },
    ],
  },
  {
    vendorEmail: 'vendor.dalat@smarthotel.vn',
    locationSlug: 'lam-dong-da-lat',
    ten_khachsan: 'Pine Hill Mist Villa Đà Lạt',
    dia_chi: '18 Đường Trần Hưng Đạo, TP. Đà Lạt, Lâm Đồng',
    mo_ta:
      'Biệt thự nghỉ dưỡng 4 sao ẩn mình giữa rừng thông yên tĩnh, không khí se lạnh, thiết kế gỗ ấm cúng lãng mạn cực kỳ phù hợp cho cặp đôi, gia đình nhỏ và thân thiện với thú cưng.',
    hang_sao: 4,
    amenities: [
      'Wi-Fi tốc độ cao miễn phí',
      'Bãi đỗ xe miễn phí',
      'Nhà hàng buffet sáng',
      'Lễ tân 24/7',
      'Cho phép thú cưng',
    ],
    roomTypes: [
      {
        ten_loaiphong: 'Forest Balcony Twin',
        suc_chua: 2,
        gia_moi_dem: 1100000,
        dien_tich: 32,
        mo_ta_lp: 'Ban công ngắm đồi thông săn mây buổi sáng, máy sưởi ấm áp.',
        rooms: ['101', '102', '103'],
      },
      {
        ten_loaiphong: 'Romantic Pine Villa',
        suc_chua: 4,
        gia_moi_dem: 2350000,
        dien_tich: 65,
        mo_ta_lp: 'Nguyên căn riêng tư có lò sưởi và sân vườn BBQ ngoài trời.',
        rooms: ['V01', 'V02'],
      },
    ],
    services: [
      { ten_dichvu: 'Set tiệc BBQ sân vườn (2-4 người)', gia_dichvu: 850000, don_vi_tinh: 'Set' },
      { ten_dichvu: 'Thuê xe máy khám phá Đà Lạt', gia_dichvu: 150000, don_vi_tinh: 'Ngày' },
    ],
  },
  {
    vendorEmail: 'vendor.danang@smarthotel.vn',
    locationSlug: 'kien-giang-phu-quoc',
    ten_khachsan: 'Emerald Pearl Phú Quốc Resort',
    dia_chi: 'Bãi Trường, Dương Tơ, TP. Phú Quốc, Kiên Giang',
    mo_ta:
      'Thiên đường nghỉ dưỡng 5 sao bên bờ biển Phú Quốc với bãi cát trắng riêng, hồ bơi vô cực ngắm hoàng hôn tuyệt đẹp, spa thảo mộc và khu vui chơi trẻ em.',
    hang_sao: 5,
    amenities: [
      'Wi-Fi tốc độ cao miễn phí',
      'Hồ bơi vô cực',
      'Bãi đỗ xe miễn phí',
      'Spa & Massage',
      'Nhà hàng buffet sáng',
      'Quầy bar tầng thượng',
      'Đưa đón sân bay',
      'Hướng biển',
    ],
    roomTypes: [
      {
        ten_loaiphong: 'Ocean Sunset Bungalow',
        suc_chua: 2,
        gia_moi_dem: 2650000,
        dien_tich: 50,
        mo_ta_lp: 'Bungalow sát biển riêng tư, ngắm hoàng hôn trực diện.',
        rooms: ['B01', 'B02', 'B03'],
      },
      {
        ten_loaiphong: 'Pool Villa 2 Phòng Ngủ',
        suc_chua: 4,
        gia_moi_dem: 4500000,
        dien_tich: 110,
        mo_ta_lp: 'Hồ bơi riêng trong khuôn viên villa, dịch vụ quản gia 24/7.',
        rooms: ['PV01', 'PV02'],
      },
    ],
    services: [
      { ten_dichvu: 'Tour cano 4 đảo Phú Quốc', gia_dichvu: 950000, don_vi_tinh: 'Khách' },
      { ten_dichvu: 'Đưa đón sân bay Phú Quốc', gia_dichvu: 250000, don_vi_tinh: 'Lượt' },
    ],
  },
  {
    vendorEmail: 'vendor.dalat@smarthotel.vn',
    locationSlug: 'ha-noi-hoan-kiem',
    ten_khachsan: 'Hanoi Old Quarter Heritage Hotel',
    dia_chi: '42 Hàng Bè, Quận Hoàn Kiếm, Hà Nội',
    mo_ta:
      'Khách sạn 4 sao mang phong cách Đông Dương tinh tế giữa lòng phố cổ Hà Nội, cách Hồ Hoàn Kiếm chỉ 200m, thuận tiện khám phá ẩm thực và văn hóa thủ đô.',
    hang_sao: 4,
    amenities: [
      'Wi-Fi tốc độ cao miễn phí',
      'Nhà hàng buffet sáng',
      'Đưa đón sân bay',
      'Lễ tân 24/7',
      'Spa & Massage',
    ],
    roomTypes: [
      {
        ten_loaiphong: 'Heritage Deluxe',
        suc_chua: 2,
        gia_moi_dem: 1350000,
        dien_tich: 30,
        mo_ta_lp: 'Nội thất Indochine sang trọng, cửa sổ nhìn ra phố cổ.',
        rooms: ['401', '402', '403'],
      },
    ],
    services: [
      { ten_dichvu: 'Đưa đón sân bay Nội Bài', gia_dichvu: 400000, don_vi_tinh: 'Lượt' },
      { ten_dichvu: 'City Tour Hà Nội nửa ngày', gia_dichvu: 550000, don_vi_tinh: 'Khách' },
    ],
  },
  {
    vendorEmail: 'vendor.dalat@smarthotel.vn',
    locationSlug: 'khanh-hoa-nha-trang',
    ten_khachsan: 'Sunrise Beachfront Nha Trang',
    dia_chi: '64 Trần Phú, TP. Nha Trang, Khánh Hòa',
    mo_ta:
      'Khách sạn 3 sao giá tốt ngay mặt tiền đường biển Trần Phú, phòng sạch sẽ sáng sủa, có hồ bơi ngoài trời và nhân viên thân thiện. Phù hợp du lịch tiết kiệm cùng bạn bè, gia đình.',
    hang_sao: 3,
    amenities: [
      'Wi-Fi tốc độ cao miễn phí',
      'Hồ bơi vô cực',
      'Bãi đỗ xe miễn phí',
      'Hướng biển',
      'Lễ tân 24/7',
    ],
    roomTypes: [
      {
        ten_loaiphong: 'Standard Sea Breeze',
        suc_chua: 2,
        gia_moi_dem: 690000,
        dien_tich: 25,
        mo_ta_lp: 'Phòng gọn gàng thoáng mát, cách bãi biển 1 phút băng qua đường.',
        rooms: ['201', '202', '203'],
      },
      {
        ten_loaiphong: 'Family Quad Ocean',
        suc_chua: 4,
        gia_moi_dem: 1150000,
        dien_tich: 40,
        mo_ta_lp: '2 giường lớn cho nhóm bạn hoặc gia đình 4 người.',
        rooms: ['301', '302'],
      },
    ],
    services: [
      { ten_dichvu: 'Thuê xe máy Nha Trang', gia_dichvu: 130000, don_vi_tinh: 'Ngày' },
      { ten_dichvu: 'Ăn sáng tự chọn', gia_dichvu: 120000, don_vi_tinh: 'Khách' },
    ],
  },
];

const ensureUser = async (client, { roleName, ho_ten, email, password, sdt }) => {
  const existing = await client.query(
    'SELECT id_nguoidung FROM nguoi_dung WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  if (existing.rowCount > 0) return Number(existing.rows[0].id_nguoidung);

  const roleRes = await client.query(
    'SELECT id_vaitro FROM vai_tro WHERE UPPER(ten_vaitro) = UPPER($1) LIMIT 1',
    [roleName]
  );
  if (roleRes.rowCount === 0) {
    throw new Error(`Chưa có vai trò ${roleName}. Vui lòng chạy "npm run seed" trước!`);
  }

  const hashed = await bcrypt.hash(password, 10);
  const inserted = await client.query(
    `INSERT INTO nguoi_dung (id_vaitro, ho_ten, email, mat_khau, sdt, trang_thai_tk)
     VALUES ($1, $2, $3, $4, $5, 'HOAT_DONG')
     RETURNING id_nguoidung`,
    [roleRes.rows[0].id_vaitro, ho_ten, email, hashed, sdt]
  );
  return Number(inserted.rows[0].id_nguoidung);
};

const ensureVendorProfile = async (client, { userId, ten_doanh_nghiep, ma_so_thue, so_tai_khoan, ty_le_chiet_khau }) => {
  const existing = await client.query(
    'SELECT id_ncc FROM ho_so_ncc WHERE id_nguoidung = $1 LIMIT 1',
    [userId]
  );
  if (existing.rowCount > 0) return Number(existing.rows[0].id_ncc);

  const inserted = await client.query(
    `INSERT INTO ho_so_ncc (id_nguoidung, ten_doanh_nghiep, ma_so_thue, so_tai_khoan, ty_le_chiet_khau, trang_thai_duyet)
     VALUES ($1, $2, $3, $4, $5, 'DA_DUYET')
     RETURNING id_ncc`,
    [userId, ten_doanh_nghiep, ma_so_thue, so_tai_khoan, ty_le_chiet_khau]
  );
  return Number(inserted.rows[0].id_ncc);
};

const runDemoSeed = async () => {
  await db.withTransaction(async (client) => {
    // 1. Tạo tài khoản Vendor & User mẫu
    const vendor1UserId = await ensureUser(client, {
      roleName: 'VENDOR',
      ho_ten: 'Nguyễn Minh Quân (Ocean Hospitality)',
      email: 'vendor.danang@smarthotel.vn',
      password: 'Vendor@123',
      sdt: '0905111222',
    });
    const vendor2UserId = await ensureUser(client, {
      roleName: 'VENDOR',
      ho_ten: 'Trần Thảo Vy (Highland Stays)',
      email: 'vendor.dalat@smarthotel.vn',
      password: 'Vendor@123',
      sdt: '0908333444',
    });

    const user1Id = await ensureUser(client, {
      roleName: 'USER',
      ho_ten: 'Lê Hoàng Nam',
      email: 'khach1@smarthotel.vn',
      password: 'User@123',
      sdt: '0912345678',
    });
    const user2Id = await ensureUser(client, {
      roleName: 'USER',
      ho_ten: 'Phạm Ngọc Anh',
      email: 'khach2@smarthotel.vn',
      password: 'User@123',
      sdt: '0987654321',
    });

    const vendorMap = {
      'vendor.danang@smarthotel.vn': await ensureVendorProfile(client, {
        userId: vendor1UserId,
        ten_doanh_nghiep: 'Tập đoàn Khách sạn Ocean Hospitality',
        ma_so_thue: '0401999888',
        so_tai_khoan: 'VCB-0041000999888',
        ty_le_chiet_khau: 10,
      }),
      'vendor.dalat@smarthotel.vn': await ensureVendorProfile(client, {
        userId: vendor2UserId,
        ten_doanh_nghiep: 'Công ty Nghỉ dưỡng Highland Stays',
        ma_so_thue: '5801777666',
        so_tai_khoan: 'TCB-1903666777888',
        ty_le_chiet_khau: 12,
      }),
    };

    // Map địa điểm & tiện ích
    const locRes = await client.query('SELECT id_diadiem, slug FROM dia_diem');
    const locBySlug = new Map(locRes.rows.map((r) => [r.slug, Number(r.id_diadiem)]));

    const amenRes = await client.query('SELECT id_tienich, ten_tienich FROM tien_ich');
    const amenByName = new Map(amenRes.rows.map((r) => [r.ten_tienich.toLowerCase(), Number(r.id_tienich)]));

    // 2. Tạo 6 khách sạn mẫu + tiện ích + loại phòng + phòng + dịch vụ
    const createdHotels = [];

    for (const h of DEMO_HOTELS) {
      const id_diadiem = locBySlug.get(h.locationSlug);
      if (!id_diadiem) {
        throw new Error(`Thiếu địa điểm slug="${h.locationSlug}". Vui lòng chạy "npm run seed" trước!`);
      }

      const existHotel = await client.query(
        'SELECT id_khachsan FROM khach_san WHERE LOWER(ten_khachsan) = LOWER($1) LIMIT 1',
        [h.ten_khachsan]
      );

      let hotelId;
      if (existHotel.rowCount > 0) {
        hotelId = Number(existHotel.rows[0].id_khachsan);
      } else {
        const insHotel = await client.query(
          `INSERT INTO khach_san (id_ncc, id_diadiem, ten_khachsan, dia_chi, mo_ta, hang_sao, trang_thai_duyet)
           VALUES ($1, $2, $3, $4, $5, $6, 'DA_DUYET')
           RETURNING id_khachsan`,
          [vendorMap[h.vendorEmail], id_diadiem, h.ten_khachsan, h.dia_chi, h.mo_ta, h.hang_sao]
        );
        hotelId = Number(insHotel.rows[0].id_khachsan);
      }

      // Gắn tiện ích
      for (const aName of h.amenities) {
        const amenId = amenByName.get(aName.toLowerCase());
        if (amenId) {
          await client.query(
            `INSERT INTO khach_san_tien_ich (id_khachsan, id_tienich)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [hotelId, amenId]
          );
        }
      }

      // Loại phòng & phòng cụ thể
      const firstRoomIds = [];
      for (const rt of h.roomTypes) {
        const existRt = await client.query(
          'SELECT id_loaiphong FROM loai_phong WHERE id_khachsan = $1 AND LOWER(ten_loaiphong) = LOWER($2) LIMIT 1',
          [hotelId, rt.ten_loaiphong]
        );
        let rtId;
        if (existRt.rowCount > 0) {
          rtId = Number(existRt.rows[0].id_loaiphong);
        } else {
          const insRt = await client.query(
            `INSERT INTO loai_phong (id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id_loaiphong`,
            [hotelId, rt.ten_loaiphong, rt.suc_chua, rt.gia_moi_dem, rt.dien_tich, rt.mo_ta_lp]
          );
          rtId = Number(insRt.rows[0].id_loaiphong);
        }

        for (const roomNo of rt.rooms) {
          const existRoom = await client.query(
            'SELECT id_phong FROM phong WHERE id_loaiphong = $1 AND so_phong = $2 LIMIT 1',
            [rtId, roomNo]
          );
          let roomId;
          if (existRoom.rowCount > 0) {
            roomId = Number(existRoom.rows[0].id_phong);
          } else {
            const floor = Number.isInteger(Number(roomNo[0])) ? Number(roomNo[0]) : 1;
            const insRoom = await client.query(
              `INSERT INTO phong (id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu)
               VALUES ($1, $2, $3, 'TRONG', 'Phòng tiêu chuẩn đầy đủ tiện nghi')
               RETURNING id_phong`,
              [rtId, roomNo, floor]
            );
            roomId = Number(insRoom.rows[0].id_phong);
          }
          firstRoomIds.push({ id_phong: roomId, gia_moi_dem: rt.gia_moi_dem });
        }
      }

      // Dịch vụ
      const serviceIds = [];
      for (const svc of h.services) {
        const existSvc = await client.query(
          'SELECT id_dichvu FROM dich_vu WHERE id_khachsan = $1 AND LOWER(ten_dichvu) = LOWER($2) LIMIT 1',
          [hotelId, svc.ten_dichvu]
        );
        let svcId;
        if (existSvc.rowCount > 0) {
          svcId = Number(existSvc.rows[0].id_dichvu);
        } else {
          const insSvc = await client.query(
            `INSERT INTO dich_vu (id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh)
             VALUES ($1, $2, $3, $4)
             RETURNING id_dichvu`,
            [hotelId, svc.ten_dichvu, svc.gia_dichvu, svc.don_vi_tinh]
          );
          svcId = Number(insSvc.rows[0].id_dichvu);
        }
        serviceIds.push({ id_dichvu: svcId, gia_dichvu: svc.gia_dichvu });
      }

      createdHotels.push({ hotelId, ten_khachsan: h.ten_khachsan, rooms: firstRoomIds, services: serviceIds });
    }

    // 3. Tạo đơn đặt phòng mẫu + thanh toán + hóa đơn VAT + đánh giá (chỉ tạo nếu chưa có đơn nào)
    const bookingCountRes = await client.query('SELECT COUNT(*)::int AS c FROM don_dat_phong');
    if (bookingCountRes.rows[0].c === 0 && createdHotels.length >= 3) {
      const h0 = createdHotels[0]; // Grand Ocean Bay (Đà Nẵng)
      const h1 = createdHotels[1]; // Saigon Central (TP.HCM)
      const h2 = createdHotels[2]; // Pine Hill (Đà Lạt)

      // Đơn 1: HOAN_THANH + Đã thanh toán + Xuất hóa đơn VAT
      const r0 = h0.rooms[0];
      const s0 = h0.services[0];
      const total1 = r0.gia_moi_dem * 2 + s0.gia_dichvu;
      const b1 = await client.query(
        `INSERT INTO don_dat_phong (id_nguoidung, id_khachsan, ngay_nhan_phong, ngay_tra_phong, tong_tien, phi_hoa_hong, trang_thai_don)
         VALUES ($1, $2, '2026-08-10', '2026-08-12', $3, $4, 'HOAN_THANH')
         RETURNING id_dondat`,
        [user1Id, h0.hotelId, total1, Math.round(total1 * 0.1)]
      );
      const b1Id = Number(b1.rows[0].id_dondat);
      await client.query(
        `INSERT INTO chi_tiet_dat_phong (id_dondat, id_phong, don_gia, so_dem, thanh_tien)
         VALUES ($1, $2, $3, 2, $4)`,
        [b1Id, r0.id_phong, r0.gia_moi_dem, r0.gia_moi_dem * 2]
      );
      await client.query(
        `INSERT INTO chi_tiet_dich_vu (id_dondat, id_dichvu, so_luong, don_gia)
         VALUES ($1, $2, 1, $3)`,
        [b1Id, s0.id_dichvu, s0.gia_dichvu]
      );
      const p1 = await client.query(
        `INSERT INTO thanh_toan (id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt)
         VALUES ($1, 'VNPAY', $2, 'VNPA-DEMO-20260810', 'DA_THANH_TOAN')
         RETURNING id_thanhtoan`,
        [b1Id, total1]
      );
      await client.query(
        `INSERT INTO hoa_don (id_thanhtoan, ma_so_thue, ten_cong_ty, email_nhan_hd)
         VALUES ($1, '0316888999', 'Công ty TNHH Công Nghệ Phương Nam', 'ketoan@phuongnam.vn')`,
        [p1.rows[0].id_thanhtoan]
      );

      // Đơn 2: HOAN_THANH tại Đà Lạt
      const r2 = h2.rooms[0];
      const total2 = r2.gia_moi_dem * 3;
      const b2 = await client.query(
        `INSERT INTO don_dat_phong (id_nguoidung, id_khachsan, ngay_nhan_phong, ngay_tra_phong, tong_tien, phi_hoa_hong, trang_thai_don)
         VALUES ($1, $2, '2026-09-15', '2026-09-18', $3, $4, 'HOAN_THANH')
         RETURNING id_dondat`,
        [user2Id, h2.hotelId, total2, Math.round(total2 * 0.12)]
      );
      const b2Id = Number(b2.rows[0].id_dondat);
      await client.query(
        `INSERT INTO chi_tiet_dat_phong (id_dondat, id_phong, don_gia, so_dem, thanh_tien)
         VALUES ($1, $2, $3, 3, $4)`,
        [b2Id, r2.id_phong, r2.gia_moi_dem, total2]
      );
      await client.query(
        `INSERT INTO thanh_toan (id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt)
         VALUES ($1, 'MOMO', $2, 'MOMO-DEMO-20260915', 'DA_THANH_TOAN')`,
        [b2Id, total2]
      );

      // Đơn 3: DA_XAC_NHAN tại TP.HCM
      const r1 = h1.rooms[0];
      const total3 = r1.gia_moi_dem * 2;
      const b3 = await client.query(
        `INSERT INTO don_dat_phong (id_nguoidung, id_khachsan, ngay_nhan_phong, ngay_tra_phong, tong_tien, phi_hoa_hong, trang_thai_don)
         VALUES ($1, $2, '2026-10-05', '2026-10-07', $3, $4, 'DA_XAC_NHAN')
         RETURNING id_dondat`,
        [user1Id, h1.hotelId, total3, Math.round(total3 * 0.1)]
      );
      const b3Id = Number(b3.rows[0].id_dondat);
      await client.query(
        `INSERT INTO chi_tiet_dat_phong (id_dondat, id_phong, don_gia, so_dem, thanh_tien)
         VALUES ($1, $2, $3, 2, $4)`,
        [b3Id, r1.id_phong, r1.gia_moi_dem, total3]
      );
      await client.query(
        `INSERT INTO thanh_toan (id_dondat, phuong_thuc, so_tien, ma_giao_dich, trang_thai_tt)
         VALUES ($1, 'CHUYEN_KHOAN', $2, 'CHUY-DEMO-20261005', 'DA_THANH_TOAN')`,
        [b3Id, total3]
      );

      // 4. Đánh giá mẫu (danh_gia)
      const sampleReviews = [
        {
          id_nguoidung: user1Id,
          id_khachsan: h0.hotelId,
          so_sao: 5,
          noi_dung:
            'Resort quá tuyệt vời! Hồ bơi vô cực nhìn thẳng ra biển Mỹ Khê, phòng sạch sẽ, nhân viên nhiệt tình và buffet sáng rất phong phú.',
          phan_hoi_ncc:
            'Grand Ocean Bay xin cảm ơn anh Nam đã dành lời khen. Rất mong được đón tiếp anh trong chuyến đi sắp tới!',
        },
        {
          id_nguoidung: user2Id,
          id_khachsan: h0.hotelId,
          so_sao: 4,
          noi_dung:
            'Phòng đẹp, view biển rất thư giãn, spa làm tốt. Tuy nhiên giờ cao điểm thang máy hơi đông một chút.',
          phan_hoi_ncc: null,
        },
        {
          id_nguoidung: user2Id,
          id_khachsan: h2.hotelId,
          so_sao: 5,
          noi_dung:
            'Không gian rừng thông siêu chill và yên tĩnh, buổi sáng mở ban công ngắm mây cực thích. Rất hợp đi nghỉ dưỡng cùng người yêu.',
          phan_hoi_ncc: 'Cảm ơn chị Ngọc Anh đã ghé thăm Pine Hill Mist Villa Đà Lạt ạ!',
        },
        {
          id_nguoidung: user1Id,
          id_khachsan: h1.hotelId,
          so_sao: 5,
          noi_dung:
            'Vị trí ngay trung tâm Quận 1 đi công tác rất tiện lợi, Wi-Fi mạnh và quầy bar tầng thượng có view đẹp.',
          phan_hoi_ncc: null,
        },
      ];

      for (const rv of sampleReviews) {
        await client.query(
          `INSERT INTO danh_gia (id_nguoidung, id_khachsan, so_sao, noi_dung, phan_hoi_ncc, trang_thai_duyet)
           VALUES ($1, $2, $3, $4, $5, 'HIEN_THI')`,
          [rv.id_nguoidung, rv.id_khachsan, rv.so_sao, rv.noi_dung, rv.phan_hoi_ncc]
        );
      }
    }
  });

  console.log('[Seed Demo] Khởi tạo dữ liệu demo thành công!');
  console.log('--- Tài khoản dùng thử ---');
  console.log('  Admin  : admin@smarthotel.vn         / Admin@123');
  console.log('  Vendor1: vendor.danang@smarthotel.vn / Vendor@123');
  console.log('  Vendor2: vendor.dalat@smarthotel.vn  / Vendor@123');
  console.log('  User 1 : khach1@smarthotel.vn        / User@123');
  console.log('  User 2 : khach2@smarthotel.vn        / User@123');
};

runDemoSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Seed Demo] Lỗi:', err.message);
    process.exit(1);
  });
