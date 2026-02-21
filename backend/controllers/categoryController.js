const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

// Get all categories (for admin)
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get active categories (for customers)
const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
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
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new category (admin only)
const createCategory = async (req, res) => {
  try {
    const { name, displayName, description, isActive, sortOrder } = req.body;
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ name: name.toLowerCase() });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = new Category({
      name: name.toLowerCase(),
      displayName,
      description,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0
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
    const { name, displayName, description, isActive, sortOrder } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if name is being changed and if it already exists
    if (name && name.toLowerCase() !== category.name) {
      const existingCategory = await Category.findOne({ name: name.toLowerCase() });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category with this name already exists' });
      }
      category.name = name.toLowerCase();
    }

    if (displayName) category.displayName = displayName;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;

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

    // Check if there are menu items using this category
    const menuItemCount = await MenuItem.countDocuments({ category: category.name });
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
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
