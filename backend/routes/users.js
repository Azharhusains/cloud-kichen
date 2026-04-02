const express = require('express');
const { getUsers, promoteToAdmin } = require('../controllers/usersController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users (ADMIN, SUPER_ADMIN only)
router.get('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), require('../middleware/validation').getUsers, getUsers);

// Promote user to Admin (SUPER_ADMIN only)
router.patch('/:id/promote-to-admin', protect, authorize('SUPER_ADMIN'), require('../middleware/validation').promoteToAdmin, promoteToAdmin);

module.exports = router;

