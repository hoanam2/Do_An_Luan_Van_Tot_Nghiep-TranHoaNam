const express = require('express');
const hotelController = require('../controllers/hotel.controller');
const roomController = require('../controllers/room.controller');
const {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireVendor,
  requireApprovedVendor,
  requireApprovedVendorOnly,
} = require('../middlewares/auth.middleware');

const router = express.Router();

// ============================================
// ROUTES QUẢN TRỊ & NHÀ CUNG CẤP (đặt trước /:id)
// ============================================
router.get('/vendor/my-hotels', authenticate, requireVendor, hotelController.listMyHotels);
router.get('/admin/all', authenticate, requireAdmin, hotelController.listHotelsAdmin);

// ============================================
// ROUTES CÔNG KHAI TÌM KIẾM & XEM CHI TIẾT
// ============================================
router.get('/', hotelController.searchHotels);
router.get('/:id', optionalAuth, hotelController.getHotelDetail);

// ============================================
// CRUD KHÁCH SẠN (Vendor sở hữu tự vận hành; Admin chỉ phê duyệt/ẩn)
// ============================================
router.post('/', authenticate, requireApprovedVendorOnly, hotelController.createHotel);
router.put('/:id', authenticate, requireApprovedVendorOnly, hotelController.updateHotel);
router.delete('/:id', authenticate, requireApprovedVendor, hotelController.deleteHotel);
router.patch('/:id/approval', authenticate, requireAdmin, hotelController.approveHotelAdmin);

// ============================================
// LOẠI PHÒNG & DỊCH VỤ THUỘC KHÁCH SẠN (Chỉ Vendor sở hữu)
// ============================================
router.get('/:hotelId/room-types', roomController.listRoomTypesByHotel);
router.post('/:hotelId/room-types', authenticate, requireApprovedVendorOnly, roomController.createRoomType);

router.get('/:hotelId/services', roomController.listServicesByHotel);
router.post('/:hotelId/services', authenticate, requireApprovedVendorOnly, roomController.createService);

module.exports = router;
