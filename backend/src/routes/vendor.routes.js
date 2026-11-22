const express = require('express');
const vendorController = require('../controllers/vendor.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// Người dùng đăng ký/xem/cập nhật hồ sơ nhà cung cấp của mình
router.post('/register', authenticate, vendorController.registerVendorProfile);
router.get('/me', authenticate, vendorController.getMyVendorProfile);
router.put('/me', authenticate, vendorController.updateMyVendorProfile);

// Quản trị viên quản lý & duyệt hồ sơ nhà cung cấp
router.get('/', authenticate, requireAdmin, vendorController.listVendorsAdmin);
router.patch('/:id/approval', authenticate, requireAdmin, vendorController.approveVendorAdmin);

module.exports = router;
