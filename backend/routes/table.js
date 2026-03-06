const express = require('express');
const { getTables, getTable, createTable, updateTable, deleteTable, updateTableStatus } = require('../controllers/tableController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route - get table by number (for customers scanning QR code)
router.get('/:tableNumber', getTable);

// Protected routes - only admin can manage tables
router.get('/', protect, authorize('admin'), getTables);
router.post('/', protect, authorize('admin'), createTable);
router.put('/:id', protect, authorize('admin'), updateTable);
router.delete('/:id', protect, authorize('admin'), deleteTable);
router.put('/:tableNumber/status', protect, authorize('admin'), updateTableStatus);

module.exports = router;

