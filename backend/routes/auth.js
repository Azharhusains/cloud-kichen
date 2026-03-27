const express = require('express');
const { body } = require('express-validator');
const { register, login, getProfile, updateProfile, addAddress, removeAddress, checkSuperAdminExists } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/check-super-admin', checkSuperAdminExists);

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').exists().withMessage('Password is required'),
  ],
  login
);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:index', protect, removeAddress);

module.exports = router;
