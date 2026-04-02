const express = require('express');
const { authRegister, authLogin, authForgotPassword, authResetPassword, profileUpdate } = require('../middleware/validation');
const { register, login, getProfile, updateProfile, addAddress, removeAddress, checkSuperAdminExists, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/check-super-admin', checkSuperAdminExists);

router.post('/register', require('../middleware/rateLimit').authLimiter, authRegister, register);

router.post('/login', require('../middleware/rateLimit').authLimiter, authLogin, login);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, profileUpdate, updateProfile);
router.post('/addresses', protect, addAddress);
router.post('/forgot-password', require('../middleware/rateLimit').authLimiter, authForgotPassword, forgotPassword);

router.post('/reset-password', require('../middleware/rateLimit').authLimiter, authResetPassword, resetPassword);
router.delete('/addresses/:index', protect, removeAddress);

module.exports = router;
