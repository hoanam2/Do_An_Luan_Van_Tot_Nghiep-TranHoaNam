const db = require('../config/db');
const { ROLES } = require('../middlewares/auth.middleware');
const { assertHotelOwnership } = require('./hotel.controller');

const ALLOWED_ROOM_STATUSES = ['TRONG', 'DANG_SU_DUNG', 'BAO_TRI', 'TAM_NGUNG'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Kiểm tra quyền sở hữu Loại phòng thông qua khách sạn -> hồ sơ NCC.
 */
const assertRoomTypeOwnership = async (roomTypeId, user) => {
  const res = await db.query(
    `SELECT lp.*, ks.id_ncc, ncc.id_nguoidung AS owner_user_id
     FROM loai_phong lp
     INNER JOIN khach_san ks ON ks.id_khachsan = lp.id_khachsan
     INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
     WHERE lp.id_loaiphong = $1
     LIMIT 1`,
    [roomTypeId]
  );

  if (res.rowCount === 0) {
    const err = new Error('Không tìm thấy loại phòng.');
    err.statusCode = 404;
    throw err;
  }

  const row = res.rows[0];
  if (user.vai_tro !== ROLES.ADMIN && Number(row.owner_user_id) !== Number(user.id_nguoidung)) {
    const err = new Error('Bạn không có quyền thao tác trên loại phòng này.');
    err.statusCode = 403;
    throw err;
  }

  return row;
};

/**
 * Kiểm tra quyền sở hữu Phòng vật lý.
 */
const assertRoomOwnership = async (roomId, user) => {
  const res = await db.query(
    `SELECT p.*, lp.id_khachsan, ncc.id_nguoidung AS owner_user_id
     FROM phong p
     INNER JOIN loai_phong lp ON lp.id_loaiphong = p.id_loaiphong
     INNER JOIN khach_san ks ON ks.id_khachsan = lp.id_khachsan
     INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
     WHERE p.id_phong = $1
     LIMIT 1`,
    [roomId]
  );

  if (res.rowCount === 0) {
    const err = new Error('Không tìm thấy phòng.');
    err.statusCode = 404;
    throw err;
  }

  const row = res.rows[0];
  if (user.vai_tro !== ROLES.ADMIN && Number(row.owner_user_id) !== Number(user.id_nguoidung)) {
    const err = new Error('Bạn không có quyền thao tác trên phòng này.');
    err.statusCode = 403;
    throw err;
  }

  return row;
};

/**
 * Kiểm tra quyền sở hữu Dịch vụ khách sạn.
 */
const assertServiceOwnership = async (serviceId, user) => {
  const res = await db.query(
    `SELECT dv.*, ncc.id_nguoidung AS owner_user_id
     FROM dich_vu dv
     INNER JOIN khach_san ks ON ks.id_khachsan = dv.id_khachsan
     INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
     WHERE dv.id_dichvu = $1
     LIMIT 1`,
    [serviceId]
  );

  if (res.rowCount === 0) {
    const err = new Error('Không tìm thấy dịch vụ.');
    err.statusCode = 404;
    throw err;
  }

  const row = res.rows[0];
  if (user.vai_tro !== ROLES.ADMIN && Number(row.owner_user_id) !== Number(user.id_nguoidung)) {
    const err = new Error('Bạn không có quyền thao tác trên dịch vụ này.');
    err.statusCode = 403;
    throw err;
  }

  return row;
};

// ============================================
// LOẠI PHÒNG (loai_phong)
// ============================================

/**
 * GET /api/hotels/:hotelId/room-types
 * Hỗ trợ truyền ?ngay_nhan_phong=YYYY-MM-DD&ngay_tra_phong=YYYY-MM-DD để tính số phòng trống thực tế.
 */
const listRoomTypesByHotel = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.hotelId);
    const { ngay_nhan_phong, ngay_tra_phong } = req.query;

    if ((ngay_nhan_phong && !ngay_tra_phong) || (!ngay_nhan_phong && ngay_tra_phong)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng truyền đầy đủ cả ngay_nhan_phong và ngay_tra_phong (YYYY-MM-DD).',
      });
    }

    if (ngay_nhan_phong && ngay_tra_phong) {
      if (!DATE_REGEX.test(ngay_nhan_phong) || !DATE_REGEX.test(ngay_tra_phong)) {
        return res.status(400).json({ success: false, message: 'Định dạng ngày phải là YYYY-MM-DD.' });
      }
      if (new Date(ngay_tra_phong) <= new Date(ngay_nhan_phong)) {
        return res.status(400).json({
          success: false,
          message: 'ngay_tra_phong phải lớn hơn ngay_nhan_phong.',
        });
      }
    }

    const result =
      ngay_nhan_phong && ngay_tra_phong
        ? await db.query(
            `SELECT
               lp.*,
               COUNT(p.id_phong)::int AS tong_so_phong,
               COUNT(p.id_phong) FILTER (
                 WHERE UPPER(p.trang_thai_phong) NOT IN ('BAO_TRI', 'TAM_NGUNG')
                   AND NOT EXISTS (
                     SELECT 1
                     FROM chi_tiet_dat_phong ctdp
                     INNER JOIN don_dat_phong ddp ON ddp.id_dondat = ctdp.id_dondat
                     WHERE ctdp.id_phong = p.id_phong
                       AND UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
                       AND ddp.ngay_nhan_phong < $3::date
                       AND ddp.ngay_tra_phong > $2::date
                   )
               )::int AS so_phong_trong
             FROM loai_phong lp
             LEFT JOIN phong p ON p.id_loaiphong = lp.id_loaiphong
             WHERE lp.id_khachsan = $1
             GROUP BY lp.id_loaiphong
             ORDER BY lp.gia_moi_dem ASC`,
            [hotelId, ngay_nhan_phong, ngay_tra_phong]
          )
        : await db.query(
            `SELECT
               lp.*,
               COUNT(p.id_phong)::int AS tong_so_phong,
               COUNT(p.id_phong) FILTER (WHERE UPPER(p.trang_thai_phong) = 'TRONG')::int AS so_phong_trong
             FROM loai_phong lp
             LEFT JOIN phong p ON p.id_loaiphong = lp.id_loaiphong
             WHERE lp.id_khachsan = $1
             GROUP BY lp.id_loaiphong
             ORDER BY lp.gia_moi_dem ASC`,
            [hotelId]
          );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        id_loaiphong: Number(r.id_loaiphong),
        id_khachsan: Number(r.id_khachsan),
        gia_moi_dem: Number(r.gia_moi_dem),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/hotels/:hotelId/room-types (Vendor chủ khách sạn / Admin)
 */
const createRoomType = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.hotelId);
    await assertHotelOwnership(hotelId, req.user);

    const { ten_loaiphong, suc_chua, gia_moi_dem, dien_tich = null, mo_ta_lp = null } = req.body;

    if (!String(ten_loaiphong || '').trim() || suc_chua === undefined || gia_moi_dem === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: ten_loaiphong, suc_chua, gia_moi_dem.',
      });
    }

    if (!Number.isInteger(Number(suc_chua)) || Number(suc_chua) <= 0) {
      return res.status(400).json({ success: false, message: 'suc_chua phải là số nguyên lớn hơn 0.' });
    }

    if (!Number.isFinite(Number(gia_moi_dem)) || Number(gia_moi_dem) < 0) {
      return res.status(400).json({ success: false, message: 'gia_moi_dem phải >= 0.' });
    }

    const result = await db.query(
      `INSERT INTO loai_phong (id_khachsan, ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        hotelId,
        String(ten_loaiphong).trim(),
        Number(suc_chua),
        Number(gia_moi_dem),
        dien_tich !== null && dien_tich !== '' ? Number(dien_tich) : null,
        mo_ta_lp,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm loại phòng thành công.',
      data: {
        ...result.rows[0],
        id_loaiphong: Number(result.rows[0].id_loaiphong),
        id_khachsan: Number(result.rows[0].id_khachsan),
        gia_moi_dem: Number(result.rows[0].gia_moi_dem),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/rooms/types/:id
 */
const updateRoomType = async (req, res, next) => {
  try {
    const roomTypeId = Number(req.params.id);
    const current = await assertRoomTypeOwnership(roomTypeId, req.user);

    const { ten_loaiphong, suc_chua, gia_moi_dem, dien_tich, mo_ta_lp } = req.body;

    if (suc_chua !== undefined && (!Number.isInteger(Number(suc_chua)) || Number(suc_chua) <= 0)) {
      return res.status(400).json({ success: false, message: 'suc_chua phải là số nguyên lớn hơn 0.' });
    }

    if (gia_moi_dem !== undefined && (!Number.isFinite(Number(gia_moi_dem)) || Number(gia_moi_dem) < 0)) {
      return res.status(400).json({ success: false, message: 'gia_moi_dem phải >= 0.' });
    }

    const updated = await db.query(
      `UPDATE loai_phong
       SET ten_loaiphong = $1,
           suc_chua = $2,
           gia_moi_dem = $3,
           dien_tich = $4,
           mo_ta_lp = $5
       WHERE id_loaiphong = $6
       RETURNING *`,
      [
        ten_loaiphong !== undefined ? String(ten_loaiphong).trim() : current.ten_loaiphong,
        suc_chua !== undefined ? Number(suc_chua) : current.suc_chua,
        gia_moi_dem !== undefined ? Number(gia_moi_dem) : current.gia_moi_dem,
        dien_tich !== undefined ? (dien_tich === null || dien_tich === '' ? null : Number(dien_tich)) : current.dien_tich,
        mo_ta_lp !== undefined ? mo_ta_lp : current.mo_ta_lp,
        roomTypeId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật loại phòng thành công.',
      data: {
        ...updated.rows[0],
        id_loaiphong: Number(updated.rows[0].id_loaiphong),
        id_khachsan: Number(updated.rows[0].id_khachsan),
        gia_moi_dem: Number(updated.rows[0].gia_moi_dem),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/rooms/types/:id
 */
const deleteRoomType = async (req, res, next) => {
  try {
    const roomTypeId = Number(req.params.id);
    await assertRoomTypeOwnership(roomTypeId, req.user);

    await db.query('DELETE FROM loai_phong WHERE id_loaiphong = $1', [roomTypeId]);
    return res.status(200).json({
      success: true,
      message: 'Xóa loại phòng thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================
// PHÒNG CỤ THỂ (phong)
// ============================================

/**
 * GET /api/rooms/types/:roomTypeId/rooms
 * Liệt kê danh sách phòng thuộc loại phòng (hỗ trợ lọc trạng thái hoặc kiểm tra trống theo ngày).
 */
const listRoomsByType = async (req, res, next) => {
  try {
    const roomTypeId = Number(req.params.roomTypeId);
    const { trang_thai_phong, ngay_nhan_phong, ngay_tra_phong } = req.query;

    const conditions = ['p.id_loaiphong = $1'];
    const params = [roomTypeId];

    if (trang_thai_phong) {
      params.push(String(trang_thai_phong).trim().toUpperCase());
      conditions.push(`UPPER(p.trang_thai_phong) = $${params.length}`);
    }

    if (ngay_nhan_phong && ngay_tra_phong) {
      if (!DATE_REGEX.test(ngay_nhan_phong) || !DATE_REGEX.test(ngay_tra_phong)) {
        return res.status(400).json({ success: false, message: 'Định dạng ngày phải là YYYY-MM-DD.' });
      }
      if (new Date(ngay_tra_phong) <= new Date(ngay_nhan_phong)) {
        return res.status(400).json({
          success: false,
          message: 'ngay_tra_phong phải lớn hơn ngay_nhan_phong.',
        });
      }

      params.push(ngay_nhan_phong, ngay_tra_phong);
      const checkInParam = `$${params.length - 1}`;
      const checkOutParam = `$${params.length}`;

      conditions.push(`UPPER(p.trang_thai_phong) NOT IN ('BAO_TRI', 'TAM_NGUNG')`);
      conditions.push(
        `NOT EXISTS (
          SELECT 1
          FROM chi_tiet_dat_phong ctdp
          INNER JOIN don_dat_phong ddp ON ddp.id_dondat = ctdp.id_dondat
          WHERE ctdp.id_phong = p.id_phong
            AND UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
            AND ddp.ngay_nhan_phong < ${checkOutParam}::date
            AND ddp.ngay_tra_phong > ${checkInParam}::date
        )`
      );
    }

    const result = await db.query(
      `SELECT p.id_phong, p.id_loaiphong, p.so_phong, p.tang, p.trang_thai_phong, p.ghi_chu
       FROM phong p
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.tang ASC NULLS LAST, p.so_phong ASC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        id_phong: Number(r.id_phong),
        id_loaiphong: Number(r.id_loaiphong),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/rooms/types/:roomTypeId/rooms
 * Tạo 1 phòng ({ so_phong, tang, ghi_chu }) hoặc tạo hàng loạt ({ rooms: [{ so_phong, tang, ghi_chu }, ...] }).
 */
const createRooms = async (req, res, next) => {
  try {
    const roomTypeId = Number(req.params.roomTypeId);
    await assertRoomTypeOwnership(roomTypeId, req.user);

    const items = Array.isArray(req.body.rooms)
      ? req.body.rooms
      : [
          {
            so_phong: req.body.so_phong,
            tang: req.body.tang,
            trang_thai_phong: req.body.trang_thai_phong,
            ghi_chu: req.body.ghi_chu,
          },
        ];

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách phòng cần tạo không được trống.' });
    }

    for (const item of items) {
      if (!String(item.so_phong || '').trim()) {
        return res.status(400).json({ success: false, message: 'Mỗi phòng bắt buộc phải có so_phong.' });
      }
      if (
        item.trang_thai_phong &&
        !ALLOWED_ROOM_STATUSES.includes(String(item.trang_thai_phong).trim().toUpperCase())
      ) {
        return res.status(400).json({
          success: false,
          message: `trang_thai_phong chỉ chấp nhận: ${ALLOWED_ROOM_STATUSES.join(', ')}.`,
        });
      }
    }

    const createdRooms = await db.withTransaction(async (client) => {
      const inserted = [];
      for (const item of items) {
        const resInsert = await client.query(
          `INSERT INTO phong (id_loaiphong, so_phong, tang, trang_thai_phong, ghi_chu)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            roomTypeId,
            String(item.so_phong).trim(),
            item.tang !== undefined && item.tang !== null && item.tang !== '' ? Number(item.tang) : null,
            item.trang_thai_phong ? String(item.trang_thai_phong).trim().toUpperCase() : 'TRONG',
            item.ghi_chu || null,
          ]
        );
        inserted.push({
          ...resInsert.rows[0],
          id_phong: Number(resInsert.rows[0].id_phong),
          id_loaiphong: Number(resInsert.rows[0].id_loaiphong),
        });
      }
      return inserted;
    });

    return res.status(201).json({
      success: true,
      message: `Đã tạo thành công ${createdRooms.length} phòng.`,
      data: createdRooms.length === 1 ? createdRooms[0] : createdRooms,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/rooms/:id
 */
const updateRoom = async (req, res, next) => {
  try {
    const roomId = Number(req.params.id);
    const current = await assertRoomOwnership(roomId, req.user);

    const { so_phong, tang, trang_thai_phong, ghi_chu } = req.body;
    const nextStatus =
      trang_thai_phong !== undefined
        ? String(trang_thai_phong).trim().toUpperCase()
        : current.trang_thai_phong;

    if (!ALLOWED_ROOM_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `trang_thai_phong chỉ chấp nhận: ${ALLOWED_ROOM_STATUSES.join(', ')}.`,
      });
    }

    const updated = await db.query(
      `UPDATE phong
       SET so_phong = $1,
           tang = $2,
           trang_thai_phong = $3,
           ghi_chu = $4
       WHERE id_phong = $5
       RETURNING *`,
      [
        so_phong !== undefined ? String(so_phong).trim() : current.so_phong,
        tang !== undefined ? (tang === null || tang === '' ? null : Number(tang)) : current.tang,
        nextStatus,
        ghi_chu !== undefined ? ghi_chu : current.ghi_chu,
        roomId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật phòng thành công.',
      data: {
        ...updated.rows[0],
        id_phong: Number(updated.rows[0].id_phong),
        id_loaiphong: Number(updated.rows[0].id_loaiphong),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/rooms/:id/status
 */
const updateRoomStatus = async (req, res, next) => {
  try {
    const roomId = Number(req.params.id);
    await assertRoomOwnership(roomId, req.user);

    const nextStatus = String(req.body.trang_thai_phong || '').trim().toUpperCase();
    if (!ALLOWED_ROOM_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `trang_thai_phong chỉ chấp nhận: ${ALLOWED_ROOM_STATUSES.join(', ')}.`,
      });
    }

    const updated = await db.query(
      `UPDATE phong
       SET trang_thai_phong = $1
       WHERE id_phong = $2
       RETURNING *`,
      [nextStatus, roomId]
    );

    return res.status(200).json({
      success: true,
      message: `Đã chuyển trạng thái phòng sang "${nextStatus}".`,
      data: {
        ...updated.rows[0],
        id_phong: Number(updated.rows[0].id_phong),
        id_loaiphong: Number(updated.rows[0].id_loaiphong),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/rooms/:id
 */
const deleteRoom = async (req, res, next) => {
  try {
    const roomId = Number(req.params.id);
    await assertRoomOwnership(roomId, req.user);

    await db.query('DELETE FROM phong WHERE id_phong = $1', [roomId]);
    return res.status(200).json({
      success: true,
      message: 'Xóa phòng thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================
// DỊCH VỤ KHÁCH SẠN (dich_vu)
// ============================================

/**
 * GET /api/hotels/:hotelId/services
 */
const listServicesByHotel = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.hotelId);
    const result = await db.query(
      `SELECT id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh
       FROM dich_vu
       WHERE id_khachsan = $1
       ORDER BY id_dichvu ASC`,
      [hotelId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        id_dichvu: Number(r.id_dichvu),
        id_khachsan: Number(r.id_khachsan),
        gia_dichvu: Number(r.gia_dichvu),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/hotels/:hotelId/services
 */
const createService = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.hotelId);
    await assertHotelOwnership(hotelId, req.user);

    const { ten_dichvu, gia_dichvu, don_vi_tinh } = req.body;
    if (
      !String(ten_dichvu || '').trim() ||
      gia_dichvu === undefined ||
      !String(don_vi_tinh || '').trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: ten_dichvu, gia_dichvu, don_vi_tinh.',
      });
    }

    if (!Number.isFinite(Number(gia_dichvu)) || Number(gia_dichvu) < 0) {
      return res.status(400).json({ success: false, message: 'gia_dichvu phải >= 0.' });
    }

    const result = await db.query(
      `INSERT INTO dich_vu (id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [hotelId, String(ten_dichvu).trim(), Number(gia_dichvu), String(don_vi_tinh).trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm dịch vụ thành công.',
      data: {
        ...result.rows[0],
        id_dichvu: Number(result.rows[0].id_dichvu),
        id_khachsan: Number(result.rows[0].id_khachsan),
        gia_dichvu: Number(result.rows[0].gia_dichvu),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/rooms/services/:id
 */
const updateService = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id);
    const current = await assertServiceOwnership(serviceId, req.user);

    const { ten_dichvu, gia_dichvu, don_vi_tinh } = req.body;
    if (gia_dichvu !== undefined && (!Number.isFinite(Number(gia_dichvu)) || Number(gia_dichvu) < 0)) {
      return res.status(400).json({ success: false, message: 'gia_dichvu phải >= 0.' });
    }

    const updated = await db.query(
      `UPDATE dich_vu
       SET ten_dichvu = $1, gia_dichvu = $2, don_vi_tinh = $3
       WHERE id_dichvu = $4
       RETURNING *`,
      [
        ten_dichvu !== undefined ? String(ten_dichvu).trim() : current.ten_dichvu,
        gia_dichvu !== undefined ? Number(gia_dichvu) : current.gia_dichvu,
        don_vi_tinh !== undefined ? String(don_vi_tinh).trim() : current.don_vi_tinh,
        serviceId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật dịch vụ thành công.',
      data: {
        ...updated.rows[0],
        id_dichvu: Number(updated.rows[0].id_dichvu),
        id_khachsan: Number(updated.rows[0].id_khachsan),
        gia_dichvu: Number(updated.rows[0].gia_dichvu),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/rooms/services/:id
 */
const deleteService = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id);
    await assertServiceOwnership(serviceId, req.user);

    await db.query('DELETE FROM dich_vu WHERE id_dichvu = $1', [serviceId]);
    return res.status(200).json({
      success: true,
      message: 'Xóa dịch vụ thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listRoomTypesByHotel,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  listRoomsByType,
  createRooms,
  updateRoom,
  updateRoomStatus,
  deleteRoom,
  listServicesByHotel,
  createService,
  updateService,
  deleteService,
};
