const express = require('express'); 
const { 
  getCategories, 
  getActiveCategories,
  getCategoriesByKitchen,
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { requireKitchenContext } = require('../middleware/kitchenAuth');

const router = express.Router();

// Debug middleware to log what's happening
router.use((req, res, next) => {
  console.log('=== category route ===');
  console.log('method:', req.method);
  console.log('path:', req.path);
  console.log('body:', req.body);
  next();
});

// Protected routes (admin only) - MUST be defined before /:id to avoid route conflicts
router.get('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), getCategories);
router.post('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), createCategory);
router.put('/:id', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), updateCategory);
router.delete('/:id', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), deleteCategory);

// Public routes - /active must be defined before /:id
router.get('/active', getActiveCategories);
router.get('/kitchen/:kitchenId', getCategoriesByKitchen);
router.get('/kitchen', getCategoriesByKitchen);
router.get('/:id', getCategoryById);

module.exports = router;
