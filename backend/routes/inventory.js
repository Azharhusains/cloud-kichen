const express = require('express');
const { getInventory, deleteInventory, updateInventory } = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), getInventory);
router.delete('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), deleteInventory);
router.put('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateInventory);

module.exports = router;
