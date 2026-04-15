const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Order = require('../models/Order');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/menu-images');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp + random number + extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const getMenuItems = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) {
      query.category = category;
    }
    const menuItems = await MenuItem.find(query).populate('createdBy updatedBy', 'name').sort({ createdAt: -1 });
    
    // Get all unique categories from the database (from Category collection)
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    
    // Return both menu items and categories
    res.json({
      menuItems,
      categories
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// NEW: Get recommended / most popular items
const getRecommendedItems = async (req, res) => {
  try {
    // Aggregate most ordered items from all orders
    const popularItems = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          totalQuantity: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1, orderCount: -1 } },
      { $limit: 12 }, // Top 12 most popular
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem'
        }
      },
      { $unwind: '$menuItem' },
      { $match: { 'menuItem.isAvailable': true } },
      {
        $project: {
          _id: '$menuItem._id',
          name: '$menuItem.name',
          category: '$menuItem.category',
          description: '$menuItem.description',
          supportsHalf: '$menuItem.supportsHalf',
          fullPrice: '$menuItem.fullPrice',
          halfPrice: '$menuItem.halfPrice',
          image: '$menuItem.image',
          isAvailable: '$menuItem.isAvailable',
          popularityScore: { $add: ['$totalQuantity', '$orderCount'] },
          totalQuantity: 1,
          orderCount: 1
        }
      },
      { $sort: { popularityScore: -1 } },
      { $limit: 8 }
    ]);

    res.json({
      recommendedItems: popularItems,
      message: 'Most popular items based on order history'
    });
  } catch (error) {
    console.error('Recommendation aggregation error:', error);
    // Fallback to regular menu items
    res.json({ 
      recommendedItems: [],
      message: 'Using regular menu - enable order history for personalized recommendations'
    });
  }
};

const getMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
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
      ...sanitizedBody,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };
    const menuItem = new MenuItem(menuItemData);
    const createdItem = await menuItem.save();
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.emit('menuAvailabilityChanged', createdItem);
    io.to('adminRoom').emit('menuItemUpdated', createdItem);
    
    res.status(201).json(createdItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
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
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.emit('menuAvailabilityChanged', updatedItem);
    io.to('adminRoom').emit('menuItemUpdated', updatedItem);
    
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
  upload,
  getRecommendedItems
 };

