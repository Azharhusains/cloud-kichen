const express = require('express');
const { getTables, getTable, createTable, updateTable, deleteTable, updateTableStatus, lockTable } = require('../controllers/tableController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route - get table by number (for customers scanning QR code)
router.get('/:tableNumber', getTable);

// Protected routes - only admin can manage tables
router.get('/', getTables);
router.post('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), createTable);
router.put('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateTable);
router.delete('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), deleteTable);
router.put('/:tableNumber/status', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateTableStatus);

// Customer lock endpoint (protected but no admin role)
router.post('/:tableNumber/lock', protect, lockTable);

module.exports = router;


