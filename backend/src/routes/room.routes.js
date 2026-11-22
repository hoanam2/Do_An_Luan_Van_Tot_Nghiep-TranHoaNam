const express = require('express');
const roomController = require('../controllers/room.controller');
const { authenticate, requireApprovedVendorOnly } = require('../middlewares/auth.middleware');

const router = express.Router();

// Loại phòng (loai_phong) - Chỉ đúng Nhà cung cấp sở hữu khách sạn
router.put('/types/:id', authenticate, requireApprovedVendorOnly, roomController.updateRoomType);
router.delete('/types/:id', authenticate, requireApprovedVendorOnly, roomController.deleteRoomType);

// Phòng cụ thể thuộc loại phòng (phong)
router.get('/types/:roomTypeId/rooms', roomController.listRoomsByType);
router.post('/types/:roomTypeId/rooms', authenticate, requireApprovedVendorOnly, roomController.createRooms);

// Dịch vụ khách sạn (dich_vu) - đặt trước /:id để tránh trùng param
router.put('/services/:id', authenticate, requireApprovedVendorOnly, roomController.updateService);
router.delete('/services/:id', authenticate, requireApprovedVendorOnly, roomController.deleteService);

// Thao tác trực tiếp trên từng phòng (phong)
router.put('/:id', authenticate, requireApprovedVendorOnly, roomController.updateRoom);
router.patch('/:id/status', authenticate, requireApprovedVendorOnly, roomController.updateRoomStatus);
router.delete('/:id', authenticate, requireApprovedVendorOnly, roomController.deleteRoom);

module.exports = router;
