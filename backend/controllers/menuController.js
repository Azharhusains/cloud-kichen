const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const path = require('path');
const fs = require('fs');
const { uploadMenuImage } = require('../middleware/multer');

const getCustomerKitchens = async (req) => {
  const Kitchen = require('../models/Kitchen');
  const kitchens = [];
  
  // Prioritize currentKitchen if active
  if (req.user.currentKitchen) {
    const currentKitchen = await Kitchen.findOne({
      _id: req.user.currentKitchen,
      status: 'active'
    });
    if (currentKitchen) {
      kitchens.push(currentKitchen._id);
    }
  }
  
  // Add all other active kitchens
  const allActiveKitchens = await Kitchen.find(
    { status: 'active' },
    { _id: 1 }
  );
  allActiveKitchens.forEach(kitchen => {
    if (!kitchens.includes(kitchen._id)) {
      kitchens.push(kitchen._id);
    }
  });
  
  return kitchens;
};

const upload = uploadMenuImage;

const getMenuItems = async (req, res) => {
  try {
    const { category } = req.query;
    let query = { isAvailable: true }; // Only show available items publicly

    // Handle CUSTOMER kitchen filtering
    if (req.user.role === 'CUSTOMER') {
      const customerKitchenIds = await getCustomerKitchens(req);
      if (customerKitchenIds.length === 0) {
        return res.status(400).json({ message: 'No active kitchens available' });
      }
      query.kitchenId = { $in: customerKitchenIds };
      console.log(`Customer ${req.user._id} viewing ${customerKitchenIds.length} kitchen(s): ${customerKitchenIds.join(', ')}`);
    } 
    // For admin/staff: filter by kitchen context, show all items including unavailable
    else if (req.user.role !== 'CUSTOMER' && req.kitchen) {
      query.kitchenId = req.kitchen._id;
      delete query.isAvailable; // Admins see all items regardless of availability
    }
    
    if (category) {
      query.category = category;
    }
    
    const menuItems = await MenuItem.find(query)
      .populate('createdBy updatedBy', 'name')
      .populate('category', 'name displayName')
      .sort({ createdAt: -1 });
    
    // Map to ensure category field is name for backward compatibility
    const mappedMenuItems = menuItems.map(item => {
      const itemObj = item.toObject();
      // If category is populated, set category as name, else keep as id
      if (itemObj.category && itemObj.category.name) {
        itemObj.categoryId = itemObj.category._id;
        itemObj.category = itemObj.category.name;
        itemObj.categoryDisplayName = itemObj.category.displayName;
      }
      return itemObj;
    });

    // Get categories - sync with menu items kitchen filter
    const categoryQuery = { isActive: true };
    
    if (req.user.role === 'CUSTOMER') {
      const customerKitchenIds = await getCustomerKitchens(req);
      if (customerKitchenIds.length === 0) {
        return res.status(400).json({ message: 'No active kitchens available' });
      }
      categoryQuery.kitchenId = { $in: customerKitchenIds };
      console.log(`Customer ${req.user._id} viewing ${customerKitchenIds.length} kitchen(s): ${customerKitchenIds.join(', ')}`);
    } else if (req.kitchen) {
      categoryQuery.kitchenId = req.kitchen._id;
    }
    
    const categories = await Category.find(categoryQuery).sort({ sortOrder: 1 });
    
    // Return both menu items and categories
    res.json({
      menuItems: mappedMenuItems,
      categories
    });
  } catch (error) {
    console.error('getMenuItems error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    // Verify menu item belongs to current kitchen if kitchen context is present
    if (req.kitchen && menuItem.kitchenId.toString() !== req.kitchen._id.toString()) {
      return res.status(403).json({ message: 'Menu item does not belong to this kitchen' });
    }
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sanitizeFormData = (body) => {
  const sanitized = { ...body };
  
  // Convert string booleans
  if (sanitized.supportsHalf === 'true') sanitized.supportsHalf = true;
  if (sanitized.supportsHalf === 'false') sanitized.supportsHalf = false;
  if (sanitized.isAvailable === 'true') sanitized.isAvailable = true;
  if (sanitized.isAvailable === 'false') sanitized.isAvailable = false;
  
  // Convert numbers, handle "null" strings → null
  const numberFields = ['fullPrice', 'halfPrice', 'costPrice'];
  numberFields.forEach(field => {
    if (sanitized[field] === 'null' || sanitized[field] === null || sanitized[field] === undefined || sanitized[field] === '') {
      sanitized[field] = null;
    } else {
      const num = parseFloat(sanitized[field]);
      sanitized[field] = isNaN(num) ? null : num;
    }
  });
  
  return sanitized;
};

const createMenuItem = async (req, res) => {
  try {
    // If file was uploaded, add image path to body
    if (req.file) {
      req.body.image = `/uploads/menu-images/${req.file.filename}`;
    }

    // Sanitize form data first
    const sanitizedBody = sanitizeFormData(req.body);

    // Resolve category name to ObjectId
    let categoryId = sanitizedBody.category;
    if (categoryId && typeof categoryId === 'string') {
      const Category = require('../models/Category');
      const categoryDoc = await Category.findOne({ name: categoryId.toLowerCase() });
      if (!categoryDoc) {
        return res.status(400).json({ message: `Category "${categoryId}" not found. Please create the category first.` });
      }
      categoryId = categoryDoc._id;
    }

    // Validation for half portions (after sanitization)
    if (sanitizedBody.supportsHalf === true) {
      if (!sanitizedBody.halfPrice || sanitizedBody.halfPrice <= 0) {
        return res.status(400).json({ message: 'Half price is required when supportsHalf is true' });
      }
      if (sanitizedBody.halfPrice >= sanitizedBody.fullPrice) {
        return res.status(400).json({ message: 'Half price must be less than full price' });
      }
    }

    // Backward compatibility: if no fullPrice provided but price exists, use price
    if (!sanitizedBody.fullPrice && req.body.price) {
      sanitizedBody.fullPrice = parseFloat(req.body.price);
    }
    
    const menuItemData = {
      name: sanitizedBody.name,
      category: categoryId,
      description: sanitizedBody.description,
      supportsHalf: sanitizedBody.supportsHalf,
      fullPrice: sanitizedBody.fullPrice,
      halfPrice: sanitizedBody.halfPrice,
      costPrice: sanitizedBody.costPrice,
      image: sanitizedBody.image,
      isAvailable: sanitizedBody.isAvailable,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      kitchenId: req.kitchen ? req.kitchen._id : (req.user.currentKitchen || null)
    };
    
    // Validate required fields before saving
    if (!menuItemData.category) {
      return res.status(400).json({ message: 'Category is required' });
    }
    if (!menuItemData.kitchenId) {
      return res.status(400).json({ message: 'Kitchen not found. Please select a kitchen first.' });
    }
    if (!menuItemData.fullPrice) {
      return res.status(400).json({ message: 'Full price is required' });
    }
    
    const menuItem = new MenuItem(menuItemData);
    const createdItem = await menuItem.save();
    res.status(201).json(createdItem);
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    // Verify menu item belongs to current kitchen
    if (menuItem.kitchenId.toString() !== req.kitchen._id.toString()) {
      return res.status(403).json({ message: 'Menu item does not belong to this kitchen' });
    }
    
    // If new file was uploaded, update image path
    if (req.file) {
      // Delete old image if exists
      if (menuItem.image) {
        const oldImagePath = path.join(__dirname, '..', menuItem.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      req.body.image = `/uploads/menu-images/${req.file.filename}`;
    }
    
    // If image is set to null or empty string, remove the image
    if (req.body.image === null || req.body.image === '') {
      if (menuItem.image) {
        const oldImagePath = path.join(__dirname, '..', menuItem.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      req.body.image = null;
    }

    // Sanitize form data
    const sanitizedBody = sanitizeFormData(req.body);

    // Resolve category name to ObjectId if it's a string
    if (sanitizedBody.category && typeof sanitizedBody.category === 'string') {
      const Category = require('../models/Category');
      const categoryDoc = await Category.findOne({ name: sanitizedBody.category.toLowerCase() });
      if (!categoryDoc) {
        return res.status(400).json({ message: `Category "${sanitizedBody.category}" not found` });
      }
      sanitizedBody.category = categoryDoc._id;
    }

    // Validation for half portions (after sanitization)
    const supportsHalf = sanitizedBody.supportsHalf === true;
    if (supportsHalf) {
      if (!sanitizedBody.halfPrice || sanitizedBody.halfPrice <= 0) {
        return res.status(400).json({ message: 'Half price is required when supportsHalf is true' });
      }
      if (sanitizedBody.halfPrice >= (sanitizedBody.fullPrice || menuItem.fullPrice)) {
        return res.status(400).json({ message: 'Half price must be less than full price' });
      }
    }

    // Backward compatibility: if fullPrice not provided but price changed, update fullPrice
    if (req.body.price && !sanitizedBody.fullPrice) {
      sanitizedBody.fullPrice = parseFloat(req.body.price);
    }
    
    Object.assign(menuItem, sanitizedBody);
    menuItem.updatedBy = req.user._id;
    const updatedItem = await menuItem.save();
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    // Verify menu item belongs to current kitchen
    if (menuItem.kitchenId.toString() !== req.kitchen._id.toString()) {
      return res.status(403).json({ message: 'Menu item does not belong to this kitchen' });
    }
    
    // Delete associated image file if exists
    if (menuItem.image) {
      const imagePath = path.join(__dirname, '..', menuItem.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await menuItem.deleteOne();
    res.json({ message: 'Menu item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export upload middleware and controller functions
module.exports = { 
  getMenuItems, 
  getMenuItem, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  sanitizeFormData,
  upload 
};
