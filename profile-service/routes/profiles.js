const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

// Profile routes
router.get('/:id', authMiddleware, profileController.getProfile);
router.post('/:id', authMiddleware, profileController.updateProfile);
router.post('/:id/change-password', authMiddleware, profileController.changePassword);
router.get('/:id/bookings', authMiddleware, profileController.getBookingHistory);

module.exports = router;
