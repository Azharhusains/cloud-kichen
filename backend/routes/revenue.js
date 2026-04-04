const express = require('express');
const { getRevenue } = require('../controllers/revenueController');
const { protect, authorize } = require('../middleware/auth');
const { requireKitchenContext } = require('../middleware/kitchenAuth');

const router = express.Router();

// Get revenue dashboard data
router.get('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), getRevenue);

module.exports = router;

