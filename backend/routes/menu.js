const express = require('express');
const { getMenuItems, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem, upload } = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getMenuItems);
router.get('/:id', getMenuItem);

// Handle multipart/form-data for create and update
router.post('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), upload.single('image'), createMenuItem);
router.put('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), upload.single('image'), updateMenuItem);
router.delete('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), deleteMenuItem);

module.exports = router;
