const express = require('express');
const { getKitchenStatus, toggleKitchenStatus } = require('../controllers/kitchenController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Get kitchen status (public for app integration, but protect for consistency)
router.get('/status', protect, getKitchenStatus);

// Toggle kitchen status (ADMIN/SUPER_ADMIN only)
router.put('/status', protect, authorize('ADMIN', 'SUPER_ADMIN'), toggleKitchenStatus);

module.exports = router;
