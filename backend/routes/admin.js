const express = require('express');
const {
  adminDashboard,
  listAllKitchens,
  manageKitchen
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc Admin dashboard
router.get('/dashboard', protect, authorize('ADMIN', 'SUPER_ADMIN'), adminDashboard);

// @desc List all kitchens
router.get('/kitchens', protect, authorize('ADMIN', 'SUPER_ADMIN'), listAllKitchens);

// @desc Manage kitchen status
router.patch('/kitchens/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), manageKitchen);

module.exports = router;

