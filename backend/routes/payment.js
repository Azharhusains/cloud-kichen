const express = require('express');
const { createPaymentSession, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Create payment session for checkout (requires auth)
router.post('/create-session', protect, createPaymentSession);

// Razorpay verify (public - signature verified in controller)
router.post('/verify', express.json(), verifyPayment);

module.exports = router;

