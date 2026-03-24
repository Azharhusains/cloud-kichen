const express = require('express');
const { getUsers, updateUserRole } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Admin panel: get users list (search/paginate/filter)
router.get('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), getUsers);

// Admin panel: update role
router.patch('/:id/role', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateUserRole);

module.exports = router;
