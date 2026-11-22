const express = require('express');
const aiController = require('../controllers/ai.controller');
const {
  authenticate,
  requireAdmin,
  requireApprovedVendor,
} = require('../middlewares/auth.middleware');

const router = express.Router();

// Tìm kiếm ngữ nghĩa AI, Chatbot tư vấn, Khách sạn tương tự & Tóm tắt đánh giá (Public)
router.post('/search', aiController.semanticSearch);
router.post('/chat', aiController.chatAdvisor);
router.get('/hotels/:id/similar', aiController.getSimilarHotels);
router.get('/hotels/:id/review-summary', aiController.summarizeHotelReviews);

// Đồng bộ vector embedding REAL[] vào PostgreSQL
router.post('/embeddings/sync', authenticate, requireAdmin, aiController.syncAllEmbeddings);
router.post(
  '/embeddings/hotel/:id',
  authenticate,
  requireApprovedVendor,
  aiController.syncHotelEmbedding
);

module.exports = router;
