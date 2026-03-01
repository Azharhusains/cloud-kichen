const express = require('express');
const { getInventory, deleteInventory, updateInventory } = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('admin'), getInventory);
router.delete('/:id', protect, authorize('admin'), deleteInventory);
router.put('/', protect, authorize('admin'), updateInventory);

module.exports = router;
