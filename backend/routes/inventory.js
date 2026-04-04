const express = require('express');
const { getInventory, deleteInventory, updateInventory } = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');
const { requireKitchenContext } = require('../middleware/kitchenAuth');

const router = express.Router();

router.get('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), getInventory);
router.delete('/:id', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), deleteInventory);
router.put('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), updateInventory);

module.exports = router;
