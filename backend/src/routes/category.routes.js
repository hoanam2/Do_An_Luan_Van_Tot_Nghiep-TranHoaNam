const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// Địa điểm (dia_diem)
router.get('/locations', categoryController.listLocations);
router.post('/locations', authenticate, requireAdmin, categoryController.createLocation);
router.put('/locations/:id', authenticate, requireAdmin, categoryController.updateLocation);
router.delete('/locations/:id', authenticate, requireAdmin, categoryController.deleteLocation);

// Tiện ích (tien_ich)
router.get('/amenities', categoryController.listAmenities);
router.post('/amenities', authenticate, requireAdmin, categoryController.createAmenity);
router.put('/amenities/:id', authenticate, requireAdmin, categoryController.updateAmenity);
router.delete('/amenities/:id', authenticate, requireAdmin, categoryController.deleteAmenity);

module.exports = router;
