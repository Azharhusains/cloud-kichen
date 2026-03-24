const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { register, login, getProfile, updateProfile, addAddress, removeAddress } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['customer', 'admin', 'super_admin', 'CUSTOMER', 'ADMIN', 'SUPER_ADMIN']).withMessage('Invalid role'),
  ],
  asyncHandler(register)
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').exists().withMessage('Password is required'),
  ],
  asyncHandler(login)
);

// New endpoint for frontend register form
router.get('/super-admin-available', protect, async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'SUPER_ADMIN' });
    res.json({ superAdminExists: count > 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:index', protect, removeAddress);

module.exports = router;
