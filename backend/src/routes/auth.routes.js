const express = require('express');
const authController = require('../controllers/auth.controller');
const {
  authenticate,
  requireAdmin,
  requireVendor,
  requireApprovedVendor,
} = require('../middlewares/auth.middleware');

const router = express.Router();

// Public Auth Routes
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected Auth Routes (Mọi vai trò đã đăng nhập)
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, authController.changePassword);

// Route kiểm tra nhanh phân quyền RBAC (User / Vendor / Admin)
router.get('/check/vendor', authenticate, requireVendor, (req, res) => {
  res.json({
    success: true,
    message: 'Xác thực quyền Vendor thành công.',
    user: req.user,
  });
});

router.get('/check/vendor-approved', authenticate, requireApprovedVendor, (req, res) => {
  res.json({
    success: true,
    message: 'Xác thực quyền Vendor đã duyệt thành công.',
    user: req.user,
  });
});

router.get('/check/admin', authenticate, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Xác thực quyền Admin thành công.',
    user: req.user,
  });
});

module.exports = router;
