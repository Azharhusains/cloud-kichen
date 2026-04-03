const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');

/**
 * Multer middleware for menu image uploads
 * - Single image field
 * - Stores in uploads/menu-images/
 * - Validates image types only
 * - Secure filenames: timestamp-random.ext
 * - 5MB limit
 */

const storage = multer.diskStorage({
destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/menu-images');
    
    try {
      require('fs').mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${timestamp}-${random}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed'), false);
  }
};

const uploadMenuImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter
});

module.exports = { uploadMenuImage };

