const db = require('../config/db');
const { ROLES } = require('../middlewares/auth.middleware');

const ALLOWED_HOTEL_STATUSES = ['CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'AN'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseNumberArray = (input) => {
  if (!input) return [];
  const rawList = Array.isArray(input) ? input : String(input).split(',');
  return [...new Set(rawList.map((v) => Number(String(v).trim())).filter((n) => Number.isInteger(n) && n > 0))];
};

const validateDateRange = (checkIn, checkOut) => {
  if (!checkIn && !checkOut) return null;
  if (!checkIn || !checkOut) {
    return 'Vui lòng cung cấp đầy đủ cả ngay_nhan_phong và ngay_tra_phong (YYYY-MM-DD).';
  }
  if (!DATE_REGEX.test(checkIn) || !DATE_REGEX.test(checkOut)) {
    return 'Định dạng ngày phải là YYYY-MM-DD.';
  }
  if (new Date(checkOut) <= new Date(checkIn)) {
    return 'ngay_tra_phong phải lớn hơn ngay_nhan_phong.';
  }
  return null;
};

/**
 * Kiểm tra quyền sở hữu khách sạn (Admin hoặc đúng Vendor sở hữu id_ncc).
 */
const assertHotelOwnership = async (hotelId, user) => {
  const res = await db.query(
    `SELECT ks.*, ncc.id_nguoidung AS owner_user_id
     FROM khach_san ks
     INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
     WHERE ks.id_khachsan = $1
     LIMIT 1`,
    [hotelId]
  );

  if (res.rowCount === 0) {
    const err = new Error('Không tìm thấy khách sạn.');
    err.statusCode = 404;
    throw err;
  }

  const hotel = res.rows[0];
  if (user.vai_tro !== ROLES.ADMIN && Number(hotel.owner_user_id) !== Number(user.id_nguoidung)) {
    const err = new Error('Bạn không có quyền thao tác trên khách sạn này.');
    err.statusCode = 403;
    throw err;
  }

  return hotel;
};

/**
 * GET /api/hotels
 * Tìm kiếm & lọc khách sạn đã duyệt (hỗ trợ địa điểm, từ khóa, hạng sao, khoảng giá,
 * danh sách tiện ích, số khách, ngày nhận/trả phòng còn trống, phân trang & sắp xếp).
 */
const searchHotels = async (req, res, next) => {
  try {
    const {
      keyword,
      id_diadiem,
      tinh_thanh,
      hang_sao,
      min_price,
      max_price,
      tien_ich,
      so_khach,
      ngay_nhan_phong,
      ngay_tra_phong,
      sort_by = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    const dateError = validateDateRange(ngay_nhan_phong, ngay_tra_phong);
    if (dateError) {
      return res.status(400).json({ success: false, message: dateError });
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [`ks.trang_thai_duyet = 'DA_DUYET'`];
    const params = [];

    if (keyword) {
      params.push(`%${String(keyword).trim()}%`);
      conditions.push(
        `(ks.ten_khachsan ILIKE $${params.length} OR ks.dia_chi ILIKE $${params.length} OR ks.mo_ta ILIKE $${params.length} OR dd.tinh_thanh ILIKE $${params.length} OR dd.quan_huyen ILIKE $${params.length})`
      );
    }

    if (id_diadiem) {
      params.push(Number(id_diadiem));
      conditions.push(`ks.id_diadiem = $${params.length}`);
    }

    if (tinh_thanh) {
      params.push(`%${String(tinh_thanh).trim()}%`);
      conditions.push(`dd.tinh_thanh ILIKE $${params.length}`);
    }

    if (hang_sao) {
      const stars = parseNumberArray(hang_sao);
      if (stars.length > 0) {
        params.push(stars);
        conditions.push(`ks.hang_sao = ANY($${params.length}::int[])`);
      }
    }

    if (min_price !== undefined && min_price !== '') {
      params.push(Number(min_price));
      conditions.push(
        `EXISTS (SELECT 1 FROM loai_phong lp WHERE lp.id_khachsan = ks.id_khachsan AND lp.gia_moi_dem >= $${params.length})`
      );
    }

    if (max_price !== undefined && max_price !== '') {
      params.push(Number(max_price));
      conditions.push(
        `EXISTS (SELECT 1 FROM loai_phong lp WHERE lp.id_khachsan = ks.id_khachsan AND lp.gia_moi_dem <= $${params.length})`
      );
    }

    // Lọc khách sạn có đủ tất cả tiện ích yêu cầu
    const amenityIds = parseNumberArray(tien_ich);
    if (amenityIds.length > 0) {
      params.push(amenityIds);
      const arrParam = `$${params.length}`;
      params.push(amenityIds.length);
      const countParam = `$${params.length}`;
      conditions.push(
        `(SELECT COUNT(DISTINCT ksti.id_tienich)
          FROM khach_san_tien_ich ksti
          WHERE ksti.id_khachsan = ks.id_khachsan
            AND ksti.id_tienich = ANY(${arrParam}::bigint[])) = ${countParam}`
      );
    }

    // Lọc khách sạn có ít nhất 1 phòng đủ sức chứa và còn trống trong khoảng ngày yêu cầu
    const guestCount = Number(so_khach) || 0;
    if (ngay_nhan_phong && ngay_tra_phong) {
      params.push(ngay_nhan_phong, ngay_tra_phong);
      const checkInParam = `$${params.length - 1}`;
      const checkOutParam = `$${params.length}`;

      let capacityCondition = '';
      if (guestCount > 0) {
        params.push(guestCount);
        capacityCondition = `AND lp.suc_chua >= $${params.length}`;
      }

      conditions.push(
        `EXISTS (
          SELECT 1
          FROM loai_phong lp
          INNER JOIN phong p ON p.id_loaiphong = lp.id_loaiphong
          WHERE lp.id_khachsan = ks.id_khachsan
            ${capacityCondition}
            AND UPPER(p.trang_thai_phong) NOT IN ('BAO_TRI', 'TAM_NGUNG')
            AND NOT EXISTS (
              SELECT 1
              FROM chi_tiet_dat_phong ctdp
              INNER JOIN don_dat_phong ddp ON ddp.id_dondat = ctdp.id_dondat
              WHERE ctdp.id_phong = p.id_phong
                AND UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
                AND ddp.ngay_nhan_phong < ${checkOutParam}::date
                AND ddp.ngay_tra_phong > ${checkInParam}::date
            )
        )`
      );
    } else if (guestCount > 0) {
      params.push(guestCount);
      conditions.push(
        `EXISTS (SELECT 1 FROM loai_phong lp WHERE lp.id_khachsan = ks.id_khachsan AND lp.suc_chua >= $${params.length})`
      );
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sortMap = {
      price_asc: 'gia_thap_nhat ASC NULLS LAST, ks.id_khachsan DESC',
      price_desc: 'gia_thap_nhat DESC NULLS LAST, ks.id_khachsan DESC',
      rating_desc: 'diem_danh_gia DESC, so_luot_danh_gia DESC, ks.id_khachsan DESC',
      stars_desc: 'ks.hang_sao DESC NULLS LAST, diem_danh_gia DESC',
      newest: 'ks.id_khachsan DESC',
    };
    const orderBy = sortMap[sort_by] || sortMap.newest;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM khach_san ks
       INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
       ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    const dataParams = [...params, limitNum, offset];
    const listResult = await db.query(
      `SELECT
         ks.id_khachsan,
         ks.id_ncc,
         ks.id_diadiem,
         ks.ten_khachsan,
         ks.dia_chi,
         ks.mo_ta,
         ks.hang_sao,
         ks.trang_thai_duyet,
         dd.tinh_thanh,
         dd.quan_huyen,
         dd.slug AS dia_diem_slug,
         COALESCE(lp_stats.gia_thap_nhat, 0)::numeric AS gia_thap_nhat,
         COALESCE(lp_stats.gia_cao_nhat, 0)::numeric AS gia_cao_nhat,
         COALESCE(lp_stats.so_loai_phong, 0)::int AS so_loai_phong,
         COALESCE(dg_stats.diem_danh_gia, 0)::numeric(3,2) AS diem_danh_gia,
         COALESCE(dg_stats.so_luot_danh_gia, 0)::int AS so_luot_danh_gia,
         COALESCE(ti_agg.tien_ich, '[]'::json) AS tien_ich
       FROM khach_san ks
       INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
       LEFT JOIN LATERAL (
         SELECT
           MIN(gia_moi_dem) AS gia_thap_nhat,
           MAX(gia_moi_dem) AS gia_cao_nhat,
           COUNT(*)::int AS so_loai_phong
         FROM loai_phong
         WHERE id_khachsan = ks.id_khachsan
       ) lp_stats ON TRUE
       LEFT JOIN LATERAL (
         SELECT
           ROUND(AVG(so_sao)::numeric, 2) AS diem_danh_gia,
           COUNT(*)::int AS so_luot_danh_gia
         FROM danh_gia
         WHERE id_khachsan = ks.id_khachsan AND trang_thai_duyet = 'HIEN_THI'
       ) dg_stats ON TRUE
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id_tienich', ti.id_tienich,
             'ten_tienich', ti.ten_tienich,
             'loai_tienich', ti.loai_tienich,
             'icon', ti.icon
           ) ORDER BY ti.ten_tienich
         ) AS tien_ich
         FROM khach_san_tien_ich ksti
         INNER JOIN tien_ich ti ON ti.id_tienich = ksti.id_tienich
         WHERE ksti.id_khachsan = ks.id_khachsan
       ) ti_agg ON TRUE
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    return res.status(200).json({
      success: true,
      data: listResult.rows.map((r) => ({
        ...r,
        id_khachsan: Number(r.id_khachsan),
        id_ncc: Number(r.id_ncc),
        id_diadiem: Number(r.id_diadiem),
        gia_thap_nhat: Number(r.gia_thap_nhat),
        gia_cao_nhat: Number(r.gia_cao_nhat),
        diem_danh_gia: Number(r.diem_danh_gia),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/hotels/:id
 * Chi tiết khách sạn gồm: thông tin chung, địa điểm, tiện ích, loại phòng (kèm số phòng trống),
 * dịch vụ đi kèm và thống kê đánh giá.
 */
const getHotelDetail = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.id);
    const { ngay_nhan_phong, ngay_tra_phong } = req.query;

    const dateError = validateDateRange(ngay_nhan_phong, ngay_tra_phong);
    if (dateError) {
      return res.status(400).json({ success: false, message: dateError });
    }

    const hotelRes = await db.query(
      `SELECT
         ks.*,
         dd.tinh_thanh,
         dd.quan_huyen,
         dd.slug AS dia_diem_slug,
         ncc.ten_doanh_nghiep,
         ncc.id_nguoidung AS owner_user_id,
         COALESCE(ROUND(AVG(dg.so_sao)::numeric, 2), 0) AS diem_danh_gia,
         COUNT(dg.id_danhgia)::int AS so_luot_danh_gia
       FROM khach_san ks
       INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
       INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
       LEFT JOIN danh_gia dg ON dg.id_khachsan = ks.id_khachsan AND dg.trang_thai_duyet = 'HIEN_THI'
       WHERE ks.id_khachsan = $1
       GROUP BY ks.id_khachsan, dd.id_diadiem, ncc.id_ncc
       LIMIT 1`,
      [hotelId]
    );

    if (hotelRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn.' });
    }

    const hotel = hotelRes.rows[0];
    const isOwnerOrAdmin =
      req.user &&
      (req.user.vai_tro === ROLES.ADMIN ||
        Number(req.user.id_nguoidung) === Number(hotel.owner_user_id));

    if (hotel.trang_thai_duyet !== 'DA_DUYET' && !isOwnerOrAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Khách sạn không tồn tại hoặc chưa được phê duyệt hiển thị.',
      });
    }

    // Truy vấn song song tiện ích, loại phòng (+ số phòng trống), dịch vụ
    const roomTypeQuery =
      ngay_nhan_phong && ngay_tra_phong
        ? db.query(
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
        : db.query(
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

    const [amenitiesRes, roomTypesRes, servicesRes] = await Promise.all([
      db.query(
        `SELECT ti.id_tienich, ti.ten_tienich, ti.loai_tienich, ti.icon
         FROM khach_san_tien_ich ksti
         INNER JOIN tien_ich ti ON ti.id_tienich = ksti.id_tienich
         WHERE ksti.id_khachsan = $1
         ORDER BY ti.loai_tienich ASC, ti.ten_tienich ASC`,
        [hotelId]
      ),
      roomTypeQuery,
      db.query(
        `SELECT id_dichvu, id_khachsan, ten_dichvu, gia_dichvu, don_vi_tinh
         FROM dich_vu
         WHERE id_khachsan = $1
         ORDER BY id_dichvu ASC`,
        [hotelId]
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        id_khachsan: Number(hotel.id_khachsan),
        id_ncc: Number(hotel.id_ncc),
        ten_doanh_nghiep: hotel.ten_doanh_nghiep,
        id_diadiem: Number(hotel.id_diadiem),
        tinh_thanh: hotel.tinh_thanh,
        quan_huyen: hotel.quan_huyen,
        dia_diem_slug: hotel.dia_diem_slug,
        ten_khachsan: hotel.ten_khachsan,
        dia_chi: hotel.dia_chi,
        mo_ta: hotel.mo_ta,
        hang_sao: hotel.hang_sao,
        trang_thai_duyet: hotel.trang_thai_duyet,
        diem_danh_gia: Number(hotel.diem_danh_gia),
        so_luot_danh_gia: Number(hotel.so_luot_danh_gia),
        tien_ich: amenitiesRes.rows.map((r) => ({ ...r, id_tienich: Number(r.id_tienich) })),
        loai_phong: roomTypesRes.rows.map((r) => ({
          ...r,
          id_loaiphong: Number(r.id_loaiphong),
          id_khachsan: Number(r.id_khachsan),
          gia_moi_dem: Number(r.gia_moi_dem),
        })),
        dich_vu: servicesRes.rows.map((r) => ({
          ...r,
          id_dichvu: Number(r.id_dichvu),
          id_khachsan: Number(r.id_khachsan),
          gia_dichvu: Number(r.gia_dichvu),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/hotels/vendor/my-hotels (Vendor)
 */
const listMyHotels = async (req, res, next) => {
  try {
    if (!req.user.ho_so_ncc) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản chưa có hồ sơ nhà cung cấp.',
      });
    }

    const result = await db.query(
      `SELECT
         ks.*,
         dd.tinh_thanh,
         dd.quan_huyen,
         COUNT(DISTINCT lp.id_loaiphong)::int AS so_loai_phong,
         COUNT(DISTINCT p.id_phong)::int AS tong_so_phong
       FROM khach_san ks
       INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
       LEFT JOIN loai_phong lp ON lp.id_khachsan = ks.id_khachsan
       LEFT JOIN phong p ON p.id_loaiphong = lp.id_loaiphong
       WHERE ks.id_ncc = $1
       GROUP BY ks.id_khachsan, dd.id_diadiem
       ORDER BY ks.id_khachsan DESC`,
      [req.user.ho_so_ncc.id_ncc]
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        id_khachsan: Number(r.id_khachsan),
        id_ncc: Number(r.id_ncc),
        id_diadiem: Number(r.id_diadiem),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/hotels (Vendor đã duyệt hoặc Admin)
 * Tạo khách sạn mới và gắn danh sách tiện ích (khach_san_tien_ich) trong cùng transaction.
 */
const createHotel = async (req, res, next) => {
  try {
    const {
      id_ncc,
      id_diadiem,
      ten_khachsan,
      dia_chi,
      mo_ta = null,
      hang_sao = null,
      tien_ich_ids = [],
    } = req.body;

    const targetVendorId =
      req.user.vai_tro === ROLES.ADMIN && id_ncc ? Number(id_ncc) : req.user.ho_so_ncc?.id_ncc;

    if (!targetVendorId) {
      return res.status(400).json({
        success: false,
        message: 'Không xác định được id_ncc (hồ sơ nhà cung cấp).',
      });
    }

    if (!id_diadiem || !String(ten_khachsan || '').trim() || !String(dia_chi || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: id_diadiem, ten_khachsan, dia_chi.',
      });
    }

    if (hang_sao !== null && hang_sao !== undefined && hang_sao !== '') {
      const starNum = Number(hang_sao);
      if (!Number.isInteger(starNum) || starNum < 1 || starNum > 5) {
        return res.status(400).json({
          success: false,
          message: 'hang_sao phải là số nguyên từ 1 đến 5.',
        });
      }
    }

    const amenityIds = parseNumberArray(tien_ich_ids);
    const initialStatus = req.user.vai_tro === ROLES.ADMIN ? 'DA_DUYET' : 'CHO_DUYET';

    const created = await db.withTransaction(async (client) => {
      const insertRes = await client.query(
        `INSERT INTO khach_san (id_ncc, id_diadiem, ten_khachsan, dia_chi, mo_ta, hang_sao, trang_thai_duyet)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          targetVendorId,
          Number(id_diadiem),
          String(ten_khachsan).trim(),
          String(dia_chi).trim(),
          mo_ta,
          hang_sao ? Number(hang_sao) : null,
          initialStatus,
        ]
      );

      const hotel = insertRes.rows[0];

      if (amenityIds.length > 0) {
        await client.query(
          `INSERT INTO khach_san_tien_ich (id_khachsan, id_tienich)
           SELECT $1, unnest($2::bigint[])
           ON CONFLICT DO NOTHING`,
          [hotel.id_khachsan, amenityIds]
        );
      }

      return hotel;
    });

    return res.status(201).json({
      success: true,
      message:
        initialStatus === 'DA_DUYET'
          ? 'Tạo khách sạn thành công.'
          : 'Tạo khách sạn thành công. Khách sạn đang chờ quản trị viên phê duyệt.',
      data: {
        ...created,
        id_khachsan: Number(created.id_khachsan),
        id_ncc: Number(created.id_ncc),
        id_diadiem: Number(created.id_diadiem),
        tien_ich_ids: amenityIds,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/hotels/:id (Chủ sở hữu Vendor hoặc Admin)
 */
const updateHotel = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.id);
    const current = await assertHotelOwnership(hotelId, req.user);

    const { id_diadiem, ten_khachsan, dia_chi, mo_ta, hang_sao, tien_ich_ids } = req.body;

    if (hang_sao !== undefined && hang_sao !== null && hang_sao !== '') {
      const starNum = Number(hang_sao);
      if (!Number.isInteger(starNum) || starNum < 1 || starNum > 5) {
        return res.status(400).json({
          success: false,
          message: 'hang_sao phải là số nguyên từ 1 đến 5.',
        });
      }
    }

    const updated = await db.withTransaction(async (client) => {
      const updateRes = await client.query(
        `UPDATE khach_san
         SET id_diadiem = $1,
             ten_khachsan = $2,
             dia_chi = $3,
             mo_ta = $4,
             hang_sao = $5
         WHERE id_khachsan = $6
         RETURNING *`,
        [
          id_diadiem !== undefined ? Number(id_diadiem) : current.id_diadiem,
          ten_khachsan !== undefined ? String(ten_khachsan).trim() : current.ten_khachsan,
          dia_chi !== undefined ? String(dia_chi).trim() : current.dia_chi,
          mo_ta !== undefined ? mo_ta : current.mo_ta,
          hang_sao !== undefined ? (hang_sao ? Number(hang_sao) : null) : current.hang_sao,
          hotelId,
        ]
      );

      // Đồng bộ lại tiện ích nếu client có gửi trường tien_ich_ids
      if (tien_ich_ids !== undefined) {
        const amenityIds = parseNumberArray(tien_ich_ids);
        await client.query('DELETE FROM khach_san_tien_ich WHERE id_khachsan = $1', [hotelId]);
        if (amenityIds.length > 0) {
          await client.query(
            `INSERT INTO khach_san_tien_ich (id_khachsan, id_tienich)
             SELECT $1, unnest($2::bigint[])
             ON CONFLICT DO NOTHING`,
            [hotelId, amenityIds]
          );
        }
      }

      return updateRes.rows[0];
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin khách sạn thành công.',
      data: {
        ...updated,
        id_khachsan: Number(updated.id_khachsan),
        id_ncc: Number(updated.id_ncc),
        id_diadiem: Number(updated.id_diadiem),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/hotels/:id (Chủ sở hữu Vendor hoặc Admin)
 */
const deleteHotel = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.id);
    await assertHotelOwnership(hotelId, req.user);

    await db.query('DELETE FROM khach_san WHERE id_khachsan = $1', [hotelId]);
    return res.status(200).json({
      success: true,
      message: 'Xóa khách sạn thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/hotels/admin/all (Admin)
 */
const listHotelsAdmin = async (req, res, next) => {
  try {
    const { trang_thai_duyet, keyword } = req.query;
    const conditions = [];
    const params = [];

    if (trang_thai_duyet) {
      params.push(String(trang_thai_duyet).trim().toUpperCase());
      conditions.push(`UPPER(ks.trang_thai_duyet) = $${params.length}`);
    }

    if (keyword) {
      params.push(`%${String(keyword).trim()}%`);
      conditions.push(
        `(ks.ten_khachsan ILIKE $${params.length} OR ncc.ten_doanh_nghiep ILIKE $${params.length} OR dd.tinh_thanh ILIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT
         ks.*,
         dd.tinh_thanh,
         dd.quan_huyen,
         ncc.ten_doanh_nghiep,
         nd.email AS vendor_email
       FROM khach_san ks
       INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
       INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
       INNER JOIN nguoi_dung nd ON nd.id_nguoidung = ncc.id_nguoidung
       ${whereClause}
       ORDER BY ks.id_khachsan DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        id_khachsan: Number(r.id_khachsan),
        id_ncc: Number(r.id_ncc),
        id_diadiem: Number(r.id_diadiem),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/hotels/:id/approval (Admin)
 */
const approveHotelAdmin = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.id);
    const status = String(req.body.trang_thai_duyet || '').trim().toUpperCase();

    if (!ALLOWED_HOTEL_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `trang_thai_duyet không hợp lệ. Chỉ chấp nhận: ${ALLOWED_HOTEL_STATUSES.join(', ')}.`,
      });
    }

    const updated = await db.query(
      `UPDATE khach_san
       SET trang_thai_duyet = $1
       WHERE id_khachsan = $2
       RETURNING *`,
      [status, hotelId]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn.' });
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái khách sạn thành "${status}".`,
      data: {
        ...updated.rows[0],
        id_khachsan: Number(updated.rows[0].id_khachsan),
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  assertHotelOwnership,
  searchHotels,
  getHotelDetail,
  listMyHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  listHotelsAdmin,
  approveHotelAdmin,
};
