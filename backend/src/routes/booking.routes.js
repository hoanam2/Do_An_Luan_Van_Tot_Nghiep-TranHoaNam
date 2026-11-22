const express = require('express');
const bookingController = require('../controllers/booking.controller');
const {
  ROLES,
  authenticate,
  authorize,
  requireAdmin,
  requireVendor,
} = require('../middlewares/auth.middleware');

const router = express.Router();

// Danh sách theo vai trò (đặt trước /:id)
router.get('/my-bookings', authenticate, authorize(ROLES.USER), bookingController.listMyBookings);
router.get('/vendor/list', authenticate, requireVendor, bookingController.listVendorBookings);
router.get('/admin/all', authenticate, requireAdmin, bookingController.listAdminBookings);

// Tạo đơn (chỉ khách hàng USER) & xem chi tiết
router.post('/', authenticate, authorize(ROLES.USER), bookingController.createBooking);
router.get('/:id', authenticate, bookingController.getBookingById);

// Cập nhật trạng thái / Hủy đơn
router.patch('/:id/cancel', authenticate, bookingController.cancelBooking);
router.patch('/:id/status', authenticate, requireVendor, bookingController.updateBookingStatus);

module.exports = router;
