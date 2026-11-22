const express = require('express');
const voucherController = require('../controllers/voucher.controller');
const {
  authenticate,
  optionalAuth,
  requireVendor,
  requireApprovedVendor,
} = require('../middlewares/auth.middleware');

const router = express.Router();

// Công khai & Kiểm tra mã
router.get('/', optionalAuth, voucherController.listVouchers);
router.post('/validate', voucherController.validateVoucher);

// Nhà cung cấp xem voucher thuộc các khách sạn của mình
router.get('/vendor/my-vouchers', authenticate, requireVendor, voucherController.listVendorVouchers);

// Admin (toàn sàn / khách sạn) hoặc Vendor đã duyệt (cho chính khách sạn của mình)
router.post('/', authenticate, requireApprovedVendor, voucherController.createVoucher);
router.put('/:id', authenticate, requireApprovedVendor, voucherController.updateVoucher);
router.delete('/:id', authenticate, requireApprovedVendor, voucherController.deleteVoucher);

module.exports = router;
