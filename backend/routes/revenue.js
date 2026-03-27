const express = require('express');
const { getRevenue } = require('../controllers/revenueController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Get revenue dashboard data (SUPER_ADMIN only)
router.get('/', protect, authorize('SUPER_ADMIN'), getRevenue);

module.exports = router;

