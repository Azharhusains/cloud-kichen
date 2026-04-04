const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

// Get all categories (for admin)
const getCategories = async (req, res) => {
  try {
    console.log('=== getCategories START ===');
    console.log('req.kitchen:', req.kitchen ? 'present with _id' : 'MISSING');
    console.log('req.user:', req.user ? req.user._id : 'MISSING');
    
    if (!req.kitchen) {
      console.log('No kitchen context - returning 400');
      return res.status(400).json({ message: 'Kitchen context required' });
    }
    const kitchenId = req.kitchen._id;
    console.log('Fetching categories for kitchenId:', kitchenId);
    const categories = await Category.find({ kitchenId }).populate('createdBy updatedBy', 'name').sort({ sortOrder: 1, createdAt: -1 });
    console.log('Found categories:', categories.length);
    res.json(categories);
  } catch (error) {
    console.error('getCategories error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get active categories (for customers)
const getActiveCategories = async (req, res) => {
  try {
    let query = { isActive: true };
    const kitchenId = req.params.kitchenId || req.query.kitchenId || req.kitchen?._id;
    
    // If kitchenId is provided, filter by it
    if (kitchenId) {
      query.kitchenId = kitchenId;
    }
    // If no kitchenId provided, return all active categories from all active kitchens
    // This maintains backward compatibility for existing frontend calls
    
    const categories = await Category.find(query).sort({ sortOrder: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get categories by kitchenId (public - for customers)
const getCategoriesByKitchen = async (req, res) => {
  try {
    let query = { isActive: true };
    const kitchenId = req.params.kitchenId || req.query.kitchenId;
    
    if (kitchenId) {
      query.kitchenId = kitchenId;
    }
    
    const categories = await Category.find(query).sort({ sortOrder: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    // Verify category belongs to current kitchen if kitchen context is present
    if (req.kitchen && category.kitchenId.toString() !== req.kitchen._id.toString()) {
      return res.status(403).json({ message: 'Category does not belong to this kitchen' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new category (admin only)
const createCategory = async (req, res) => {
  try {
    console.log('=== createCategory START ===');
    console.log('req.kitchen:', req.kitchen ? 'present' : 'MISSING');
    console.log('req.body:', req.body);
    console.log('req.body type:', typeof req.body);
    
    if (!req.kitchen) {
      console.log('No kitchen context');
      return res.status(400).json({ message: 'Kitchen context required' });
    }
    
    const body = req.body;
    if (!body || typeof body !== 'object') {
      console.log('Invalid body:', body);
      return res.status(400).json({ message: 'Request body is required' });
    }
    
    const { name, displayName, description, isActive, sortOrder } = body;
    console.log('name:', name, 'type:', typeof name);
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Category name is required and must be a string' });
    }
    
    // Check if category already exists in this kitchen
    const nameLower = name.toLowerCase();
    console.log('nameLower:', nameLower);
    const existingCategory = await Category.findOne({ name: nameLower, kitchenId: req.kitchen._id });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists in this kitchen' });
    }

    const category = new Category({
      name: name.toLowerCase(),
      displayName,
      description,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      kitchenId: req.kitchen._id,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update category (admin only)
const updateCategory = async (req, res) => {
  try {
    const { name, displayName, description, isActive, sortOrder } = req.body || {};
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Verify category belongs to current kitchen
    if (category.kitchenId.toString() !== req.kitchen._id.toString()) {
      return res.status(403).json({ message: 'Category does not belong to this kitchen' });
    }

    // Check if name is being changed and if it already exists
    if (name && typeof name === 'string' && name.toLowerCase() !== category.name) {
      const nameLower = name.toLowerCase();
      const existingCategory = await Category.findOne({ name: nameLower, kitchenId: req.kitchen._id });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category with this name already exists in this kitchen' });
      }
      category.name = nameLower;
    }

    if (displayName) category.displayName = displayName;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    category.updatedBy = req.user._id;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete category (admin only)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Verify category belongs to current kitchen
    if (category.kitchenId.toString() !== req.kitchen._id.toString()) {
      return res.status(403).json({ message: 'Category does not belong to this kitchen' });
    }

    // Check if there are menu items using this category in current kitchen
    const menuItemCount = await MenuItem.countDocuments({ category: category.name, kitchenId: req.kitchen._id });
    if (menuItemCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. ${menuItemCount} menu item(s) are using this category.` 
      });
    }

    await category.remove();
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCategories,
  getActiveCategories,
  getCategoriesByKitchen,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
