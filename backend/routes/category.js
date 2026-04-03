const express = require('express');
const { 
  getCategories, 
  getActiveCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { requireKitchenContext } = require('../middleware/kitchenAuth');

const router = express.Router();

// Protected routes (admin only) - MUST be defined before /:id to avoid route conflicts
router.get('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), getCategories);
router.post('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), createCategory);
router.put('/:id', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), updateCategory);
router.delete('/:id', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), deleteCategory);

// Public routes - /active must be defined before /:id
router.get('/active', getActiveCategories);
router.get('/:id', getCategoryById);

module.exports = router;
