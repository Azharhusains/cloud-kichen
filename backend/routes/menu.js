const express = require('express');
const { getMenuItems, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem } = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');
const { requireKitchenContext } = require('../middleware/kitchenAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/menu-images');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
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
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

router.get('/', protect, requireKitchenContext, getMenuItems);
router.get('/:id', protect, getMenuItem);

// Add upload.single('image') before validation to handle multipart/form-data
router.post('/', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), upload.single('image'), require('../middleware/validation').menuCreateUpdate, createMenuItem);
router.put('/:id', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), upload.single('image'), require('../middleware/validation').menuCreateUpdate, updateMenuItem);
router.delete('/:id', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), deleteMenuItem);

module.exports = router;
