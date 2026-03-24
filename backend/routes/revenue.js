const express = require('express');
const { getRevenueDashboard } = require('../controllers/revenueController');
const { protect, restrictToSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Revenue dashboard - SUPER_ADMIN only
router.get('/dashboard', protect, restrictToSuperAdmin, getRevenueDashboard);

module.exports = router;
