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

const router = express.Router();

// Protected routes (admin only) - MUST be defined before /:id to avoid route conflicts
router.get('/', protect, authorize('admin'), getCategories);
router.post('/', protect, authorize('admin'), createCategory);
router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

// Public routes - /active must be defined before /:id
router.get('/active', getActiveCategories);
router.get('/:id', getCategoryById);

module.exports = router;
