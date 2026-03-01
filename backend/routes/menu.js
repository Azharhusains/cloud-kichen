const express = require('express');
const { getMenuItems, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem, upload } = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getMenuItems);
router.get('/:id', getMenuItem);

// Handle multipart/form-data for create and update
router.post('/', protect, authorize('admin'), upload.single('image'), createMenuItem);
router.put('/:id', protect, authorize('admin'), upload.single('image'), updateMenuItem);
router.delete('/:id', protect, authorize('admin'), deleteMenuItem);

module.exports = router;
