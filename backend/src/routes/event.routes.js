const express = require('express');
const eventController = require('../controllers/event.controller');
const { authenticate, optionalAuth, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', optionalAuth, eventController.listEvents);
router.post('/', authenticate, requireAdmin, eventController.createEvent);
router.put('/:id', authenticate, requireAdmin, eventController.updateEvent);
router.delete('/:id', authenticate, requireAdmin, eventController.deleteEvent);

module.exports = router;
