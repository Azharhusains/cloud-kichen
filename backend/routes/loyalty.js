const express = require('express');
const router = express.Router();
const {
  getLoyaltyInfo,
  getLoyaltyOverview,
  addLoyaltyPoints,
  redeemLoyaltyPoints
} = require('../controllers/loyaltyController');
const { protect } = require('../middleware/auth');

// GET /api/loyalty/ - Public loyalty program overview
router.get('/', getLoyaltyOverview);

// GET /api/loyalty/:userId - Get loyalty info
router.get('/:userId', protect, getLoyaltyInfo);

// POST /api/loyalty/add-points - Add points (admin/internal)
router.post('/add-points', protect, addLoyaltyPoints);

// POST /api/loyalty/redeem - Redeem points (customer)
router.post('/redeem', protect, redeemLoyaltyPoints);

module.exports = router;

