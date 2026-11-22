const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// Admin quản lý toàn bộ giao dịch thanh toán trên sàn
router.get('/admin/all', authenticate, requireAdmin, paymentController.listAllPaymentsAdmin);

// Hóa đơn VAT (đặt trước các route có param động)
router.get('/invoices/my', authenticate, paymentController.listMyInvoices);
router.get('/invoices/:id', authenticate, paymentController.getInvoiceById);

// Thanh toán
router.post('/', authenticate, paymentController.createPayment);
router.get('/booking/:bookingId', authenticate, paymentController.listPaymentsByBooking);
router.post('/:id/confirm', authenticate, paymentController.confirmPayment);
router.post('/:paymentId/invoice', authenticate, paymentController.createInvoice);

module.exports = router;
