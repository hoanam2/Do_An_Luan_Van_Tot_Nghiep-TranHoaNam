const db = require('../config/db');

const toSlug = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ============================================
// ĐỊA ĐIỂM (dia_diem)
// ============================================

/**
 * GET /api/categories/locations
 * Lọc địa điểm theo tinh_thanh hoặc từ khóa tìm kiếm (kèm số lượng khách sạn đã duyệt).
 */
const listLocations = async (req, res, next) => {
  try {
    const { tinh_thanh, keyword } = req.query;
    const conditions = [];
    const params = [];

    if (tinh_thanh) {
      params.push(`%${String(tinh_thanh).trim()}%`);
      conditions.push(`dd.tinh_thanh ILIKE $${params.length}`);
    }

    if (keyword) {
      params.push(`%${String(keyword).trim()}%`);
      conditions.push(
        `(dd.tinh_thanh ILIKE $${params.length} OR dd.quan_huyen ILIKE $${params.length} OR dd.slug ILIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT
         dd.id_diadiem,
         dd.tinh_thanh,
         dd.quan_huyen,
         dd.slug,
         COUNT(ks.id_khachsan) FILTER (WHERE ks.trang_thai_duyet = 'DA_DUYET')::int AS so_khach_san
       FROM dia_diem dd
       LEFT JOIN khach_san ks ON ks.id_diadiem = dd.id_diadiem
       ${whereClause}
       GROUP BY dd.id_diadiem
       ORDER BY dd.tinh_thanh ASC, dd.quan_huyen ASC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({ ...r, id_diadiem: Number(r.id_diadiem) })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/categories/locations (Admin)
 */
const createLocation = async (req, res, next) => {
  try {
    const { tinh_thanh, quan_huyen, slug } = req.body;
    if (!String(tinh_thanh || '').trim() || !String(quan_huyen || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tinh_thanh và quan_huyen.',
      });
    }

    const finalSlug = String(slug || '').trim() || toSlug(`${tinh_thanh}-${quan_huyen}`);

    const result = await db.query(
      `INSERT INTO dia_diem (tinh_thanh, quan_huyen, slug)
       VALUES ($1, $2, $3)
       RETURNING id_diadiem, tinh_thanh, quan_huyen, slug`,
      [String(tinh_thanh).trim(), String(quan_huyen).trim(), finalSlug]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm địa điểm thành công.',
      data: { ...result.rows[0], id_diadiem: Number(result.rows[0].id_diadiem) },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/categories/locations/:id (Admin)
 */
const updateLocation = async (req, res, next) => {
  try {
    const locationId = Number(req.params.id);
    const { tinh_thanh, quan_huyen, slug } = req.body;

    const existing = await db.query(
      'SELECT id_diadiem, tinh_thanh, quan_huyen, slug FROM dia_diem WHERE id_diadiem = $1',
      [locationId]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm.' });
    }

    const current = existing.rows[0];
    const nextTinh = tinh_thanh !== undefined ? String(tinh_thanh).trim() : current.tinh_thanh;
    const nextQuan = quan_huyen !== undefined ? String(quan_huyen).trim() : current.quan_huyen;
    const nextSlug =
      slug !== undefined
        ? String(slug).trim() || toSlug(`${nextTinh}-${nextQuan}`)
        : current.slug;

    const updated = await db.query(
      `UPDATE dia_diem
       SET tinh_thanh = $1, quan_huyen = $2, slug = $3
       WHERE id_diadiem = $4
       RETURNING id_diadiem, tinh_thanh, quan_huyen, slug`,
      [nextTinh, nextQuan, nextSlug, locationId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật địa điểm thành công.',
      data: { ...updated.rows[0], id_diadiem: Number(updated.rows[0].id_diadiem) },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/categories/locations/:id (Admin)
 */
const deleteLocation = async (req, res, next) => {
  try {
    const locationId = Number(req.params.id);
    const deleted = await db.query(
      'DELETE FROM dia_diem WHERE id_diadiem = $1 RETURNING id_diadiem',
      [locationId]
    );
    if (deleted.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Xóa địa điểm thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================
// TIỆN ÍCH (tien_ich)
// ============================================

/**
 * GET /api/categories/amenities
 */
const listAmenities = async (req, res, next) => {
  try {
    const { loai_tienich, keyword } = req.query;
    const conditions = [];
    const params = [];

    if (loai_tienich) {
      params.push(String(loai_tienich).trim());
      conditions.push(`LOWER(loai_tienich) = LOWER($${params.length})`);
    }
    if (keyword) {
      params.push(`%${String(keyword).trim()}%`);
      conditions.push(`ten_tienich ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT id_tienich, ten_tienich, loai_tienich, icon
       FROM tien_ich
       ${whereClause}
       ORDER BY loai_tienich ASC, ten_tienich ASC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({ ...r, id_tienich: Number(r.id_tienich) })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/categories/amenities (Admin)
 */
const createAmenity = async (req, res, next) => {
  try {
    const { ten_tienich, loai_tienich, icon = null } = req.body;
    if (!String(ten_tienich || '').trim() || !String(loai_tienich || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ ten_tienich và loai_tienich.',
      });
    }

    const result = await db.query(
      `INSERT INTO tien_ich (ten_tienich, loai_tienich, icon)
       VALUES ($1, $2, $3)
       RETURNING id_tienich, ten_tienich, loai_tienich, icon`,
      [String(ten_tienich).trim(), String(loai_tienich).trim(), icon]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm tiện ích thành công.',
      data: { ...result.rows[0], id_tienich: Number(result.rows[0].id_tienich) },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/categories/amenities/:id (Admin)
 */
const updateAmenity = async (req, res, next) => {
  try {
    const amenityId = Number(req.params.id);
    const { ten_tienich, loai_tienich, icon } = req.body;

    const existing = await db.query(
      'SELECT id_tienich, ten_tienich, loai_tienich, icon FROM tien_ich WHERE id_tienich = $1',
      [amenityId]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tiện ích.' });
    }

    const current = existing.rows[0];
    const updated = await db.query(
      `UPDATE tien_ich
       SET ten_tienich = $1, loai_tienich = $2, icon = $3
       WHERE id_tienich = $4
       RETURNING id_tienich, ten_tienich, loai_tienich, icon`,
      [
        ten_tienich !== undefined ? String(ten_tienich).trim() : current.ten_tienich,
        loai_tienich !== undefined ? String(loai_tienich).trim() : current.loai_tienich,
        icon !== undefined ? icon : current.icon,
        amenityId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật tiện ích thành công.',
      data: { ...updated.rows[0], id_tienich: Number(updated.rows[0].id_tienich) },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/categories/amenities/:id (Admin)
 */
const deleteAmenity = async (req, res, next) => {
  try {
    const amenityId = Number(req.params.id);
    const deleted = await db.query(
      'DELETE FROM tien_ich WHERE id_tienich = $1 RETURNING id_tienich',
      [amenityId]
    );
    if (deleted.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tiện ích.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Xóa tiện ích thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  listAmenities,
  createAmenity,
  updateAmenity,
  deleteAmenity,
};
