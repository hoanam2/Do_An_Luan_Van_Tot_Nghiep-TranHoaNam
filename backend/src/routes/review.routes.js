const express = require('express');
const reviewController = require('../controllers/review.controller');
const { authenticate, requireAdmin, requireVendor } = require('../middlewares/auth.middleware');

const router = express.Router();

// Công khai xem đánh giá theo khách sạn
router.get('/hotel/:hotelId', reviewController.listReviewsByHotel);

// Khách hàng đăng / sửa / xóa đánh giá
router.post('/', authenticate, reviewController.createReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);

// Vendor phản hồi & Admin kiểm duyệt
router.patch('/:id/reply', authenticate, requireVendor, reviewController.replyReview);
router.patch('/:id/moderation', authenticate, requireAdmin, reviewController.moderateReviewAdmin);

module.exports = router;
