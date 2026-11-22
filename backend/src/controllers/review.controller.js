const db = require('../config/db');
const { ROLES } = require('../middlewares/auth.middleware');

const ALLOWED_REVIEW_STATUSES = ['HIEN_THI', 'AN', 'CHO_DUYET'];

/**
 * GET /api/reviews/hotel/:hotelId
 * Lấy danh sách đánh giá hiển thị của khách sạn kèm thống kê điểm trung bình & phân bố 1-5 sao.
 */
const listReviewsByHotel = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.hotelId);
    const { page = 1, limit = 10, so_sao } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [`dg.id_khachsan = $1`, `UPPER(dg.trang_thai_duyet) = 'HIEN_THI'`];
    const params = [hotelId];

    if (so_sao) {
      params.push(Number(so_sao));
      conditions.push(`dg.so_sao = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [statsRes, countRes, listRes] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(ROUND(AVG(so_sao)::numeric, 2), 0) AS diem_trung_binh,
           COUNT(*)::int AS tong_danh_gia,
           COUNT(*) FILTER (WHERE so_sao = 5)::int AS sao_5,
           COUNT(*) FILTER (WHERE so_sao = 4)::int AS sao_4,
           COUNT(*) FILTER (WHERE so_sao = 3)::int AS sao_3,
           COUNT(*) FILTER (WHERE so_sao = 2)::int AS sao_2,
           COUNT(*) FILTER (WHERE so_sao = 1)::int AS sao_1
         FROM danh_gia
         WHERE id_khachsan = $1 AND UPPER(trang_thai_duyet) = 'HIEN_THI'`,
        [hotelId]
      ),
      db.query(`SELECT COUNT(*)::int AS total FROM danh_gia dg ${whereClause}`, params),
      db.query(
        `SELECT
           dg.id_danhgia,
           dg.id_nguoidung,
           dg.id_khachsan,
           dg.so_sao,
           dg.noi_dung,
           dg.phan_hoi_ncc,
           dg.trang_thai_duyet,
           nd.ho_ten,
           nd.avatar
         FROM danh_gia dg
         INNER JOIN nguoi_dung nd ON nd.id_nguoidung = dg.id_nguoidung
         ${whereClause}
         ORDER BY dg.id_danhgia DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offset]
      ),
    ]);

    const stats = statsRes.rows[0];
    return res.status(200).json({
      success: true,
      stats: {
        diem_trung_binh: Number(stats.diem_trung_binh),
        tong_danh_gia: stats.tong_danh_gia,
        phan_bo_sao: {
          5: stats.sao_5,
          4: stats.sao_4,
          3: stats.sao_3,
          2: stats.sao_2,
          1: stats.sao_1,
        },
      },
      data: listRes.rows.map((r) => ({
        ...r,
        id_danhgia: Number(r.id_danhgia),
        id_nguoidung: Number(r.id_nguoidung),
        id_khachsan: Number(r.id_khachsan),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countRes.rows[0].total,
        total_pages: Math.ceil(countRes.rows[0].total / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/reviews
 * Chỉ khách hàng đã có đơn lưu trú (DA_CHECKIN hoặc HOAN_THANH) tại khách sạn mới được đánh giá.
 */
const createReview = async (req, res, next) => {
  try {
    const hotelId = Number(req.body.id_khachsan);
    const stars = Number(req.body.so_sao);
    const content = req.body.noi_dung !== undefined ? String(req.body.noi_dung).trim() : null;

    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return res.status(400).json({ success: false, message: 'id_khachsan không hợp lệ.' });
    }

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, message: 'so_sao phải là số nguyên từ 1 đến 5.' });
    }

    // Chỉ cho phép khách hàng đánh giá sau khi đơn đã HOAN_THANH hoặc đã qua ngày trả phòng (ngay_tra_phong <= CURRENT_DATE)
    if (req.user.vai_tro !== ROLES.ADMIN) {
      const stayCheck = await db.query(
        `SELECT id_dondat FROM don_dat_phong
         WHERE id_nguoidung = $1
           AND id_khachsan = $2
           AND (
             UPPER(trang_thai_don) = 'HOAN_THANH'
             OR (
               UPPER(trang_thai_don) IN ('DA_XAC_NHAN', 'DA_CHECKIN')
               AND ngay_tra_phong <= CURRENT_DATE
             )
           )
         LIMIT 1`,
        [req.user.id_nguoidung, hotelId]
      );

      if (stayCheck.rowCount === 0) {
        return res.status(403).json({
          success: false,
          message:
            'Bạn chỉ có thể đánh giá sau khi đã hoàn thành lưu trú hoặc đã hết thời gian đặt phòng tại khách sạn này.',
        });
      }
    }

    const dupCheck = await db.query(
      'SELECT id_danhgia FROM danh_gia WHERE id_nguoidung = $1 AND id_khachsan = $2 LIMIT 1',
      [req.user.id_nguoidung, hotelId]
    );
    if (dupCheck.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã đánh giá khách sạn này rồi. Bạn có thể chỉnh sửa đánh giá hiện có.',
      });
    }

    const inserted = await db.query(
      `INSERT INTO danh_gia (id_nguoidung, id_khachsan, so_sao, noi_dung, trang_thai_duyet)
       VALUES ($1, $2, $3, $4, 'HIEN_THI')
       RETURNING *`,
      [req.user.id_nguoidung, hotelId, stars, content]
    );

    return res.status(201).json({
      success: true,
      message: 'Gửi đánh giá thành công.',
      data: {
        ...inserted.rows[0],
        id_danhgia: Number(inserted.rows[0].id_danhgia),
        id_nguoidung: Number(inserted.rows[0].id_nguoidung),
        id_khachsan: Number(inserted.rows[0].id_khachsan),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/reviews/:id (Tác giả tự sửa đánh giá)
 */
const updateReview = async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    const existing = await db.query('SELECT * FROM danh_gia WHERE id_danhgia = $1 LIMIT 1', [reviewId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }

    const review = existing.rows[0];
    if (
      req.user.vai_tro !== ROLES.ADMIN &&
      Number(review.id_nguoidung) !== Number(req.user.id_nguoidung)
    ) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa đánh giá này.' });
    }

    const nextStars = req.body.so_sao !== undefined ? Number(req.body.so_sao) : review.so_sao;
    if (!Number.isInteger(nextStars) || nextStars < 1 || nextStars > 5) {
      return res.status(400).json({ success: false, message: 'so_sao phải là số nguyên từ 1 đến 5.' });
    }

    const nextContent =
      req.body.noi_dung !== undefined ? String(req.body.noi_dung).trim() : review.noi_dung;

    const updated = await db.query(
      `UPDATE danh_gia
       SET so_sao = $1, noi_dung = $2
       WHERE id_danhgia = $3
       RETURNING *`,
      [nextStars, nextContent, reviewId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật đánh giá thành công.',
      data: {
        ...updated.rows[0],
        id_danhgia: Number(updated.rows[0].id_danhgia),
        id_nguoidung: Number(updated.rows[0].id_nguoidung),
        id_khachsan: Number(updated.rows[0].id_khachsan),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/reviews/:id (Tác giả hoặc Admin xóa)
 */
const deleteReview = async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    const existing = await db.query(
      'SELECT id_danhgia, id_nguoidung FROM danh_gia WHERE id_danhgia = $1 LIMIT 1',
      [reviewId]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }

    if (
      req.user.vai_tro !== ROLES.ADMIN &&
      Number(existing.rows[0].id_nguoidung) !== Number(req.user.id_nguoidung)
    ) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa đánh giá này.' });
    }

    await db.query('DELETE FROM danh_gia WHERE id_danhgia = $1', [reviewId]);
    return res.status(200).json({ success: true, message: 'Xóa đánh giá thành công.' });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/reviews/:id/reply (Vendor chủ khách sạn phản hồi đánh giá)
 */
const replyReview = async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    const replyText = String(req.body.phan_hoi_ncc || '').trim();

    if (!replyText) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung phản hồi (phan_hoi_ncc).',
      });
    }

    const reviewRes = await db.query(
      `SELECT dg.id_danhgia, ncc.id_nguoidung AS vendor_user_id
       FROM danh_gia dg
       INNER JOIN khach_san ks ON ks.id_khachsan = dg.id_khachsan
       INNER JOIN ho_so_ncc ncc ON ncc.id_ncc = ks.id_ncc
       WHERE dg.id_danhgia = $1
       LIMIT 1`,
      [reviewId]
    );

    if (reviewRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }

    if (
      req.user.vai_tro !== ROLES.ADMIN &&
      Number(reviewRes.rows[0].vendor_user_id) !== Number(req.user.id_nguoidung)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ nhà cung cấp sở hữu khách sạn này mới được phản hồi đánh giá.',
      });
    }

    const updated = await db.query(
      `UPDATE danh_gia
       SET phan_hoi_ncc = $1
       WHERE id_danhgia = $2
       RETURNING *`,
      [replyText, reviewId]
    );

    return res.status(200).json({
      success: true,
      message: 'Phản hồi đánh giá thành công.',
      data: {
        ...updated.rows[0],
        id_danhgia: Number(updated.rows[0].id_danhgia),
        id_nguoidung: Number(updated.rows[0].id_nguoidung),
        id_khachsan: Number(updated.rows[0].id_khachsan),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/reviews/:id/moderation (Admin duyệt / ẩn đánh giá vi phạm)
 */
const moderateReviewAdmin = async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    const status = String(req.body.trang_thai_duyet || '').trim().toUpperCase();

    if (!ALLOWED_REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `trang_thai_duyet chỉ chấp nhận: ${ALLOWED_REVIEW_STATUSES.join(', ')}.`,
      });
    }

    const updated = await db.query(
      `UPDATE danh_gia
       SET trang_thai_duyet = $1
       WHERE id_danhgia = $2
       RETURNING *`,
      [status, reviewId]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }

    return res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái kiểm duyệt đánh giá thành "${status}".`,
      data: {
        ...updated.rows[0],
        id_danhgia: Number(updated.rows[0].id_danhgia),
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listReviewsByHotel,
  createReview,
  updateReview,
  deleteReview,
  replyReview,
  moderateReviewAdmin,
};
