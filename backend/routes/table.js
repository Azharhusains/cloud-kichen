const express = require('express');
const { getTables, getTable, createTable, updateTable, deleteTable, updateTableStatus } = require('../controllers/tableController');
const { protect, authorize } = require('../middleware/auth');
const { requireKitchenContext } = require('../middleware/kitchenAuth');

const router = express.Router();

// Public route - get table by number (for customers scanning QR code)
router.get('/:tableNumber', getTable);

// Protected routes - only admin can manage tables
router.get('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), getTables);
router.post('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), createTable);
router.put('/:id', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), updateTable);
router.delete('/:id', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), deleteTable);
router.put('/:tableNumber/status', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), updateTableStatus);

module.exports = router;

