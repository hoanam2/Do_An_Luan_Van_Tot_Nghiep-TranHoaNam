const express = require('express');
const reportController = require('../controllers/report.controller');
const { authenticate, requireAdmin, requireVendor } = require('../middlewares/auth.middleware');

const router = express.Router();

// Báo cáo & quản trị khách hàng toàn sàn (Admin)
router.get('/admin/overview', authenticate, requireAdmin, reportController.getAdminOverview);
router.get('/admin/revenue', authenticate, requireAdmin, reportController.getAdminRevenue);
router.get('/admin/customers', authenticate, requireAdmin, reportController.listCustomersAdmin);
router.get('/admin/customers/:id/history', authenticate, requireAdmin, reportController.getCustomerHistoryAdmin);
router.patch('/admin/users/:id/status', authenticate, requireAdmin, reportController.updateUserStatusAdmin);

// Báo cáo dành cho Nhà cung cấp (Vendor / Admin)
router.get('/vendor/overview', authenticate, requireVendor, reportController.getVendorOverview);
router.get('/vendor/revenue', authenticate, requireVendor, reportController.getVendorRevenue);

module.exports = router;
