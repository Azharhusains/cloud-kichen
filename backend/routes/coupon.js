const express = require('express');
const { getCoupons, createCoupon, deleteCoupon } = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Admin only
router.use(protect, authorize('admin'));
router.get('/', getCoupons);
router.post('/', createCoupon);
router.delete('/:id', deleteCoupon);

module.exports = router;

