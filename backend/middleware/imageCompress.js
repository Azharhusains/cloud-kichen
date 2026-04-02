/**
 * Image compression middleware using Sharp
 * Applied after multer upload
 * - Resize to max 1024x1024 (maintain aspect ratio)
 * - Quality 80-90%
 * - WebP output (smaller files, modern browsers)
 * - Fallback to JPEG for legacy
 * - Prepares for CDN (optimized files)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');

const compressImage = async (req, res, next) => {
  // Only process if file uploaded (multer single field 'image')
  if (!req.file) {
    return next();
  }

  try {
    const inputPath = req.file.path;
    const outputPath = path.join(path.dirname(inputPath), `compressed_${path.basename(inputPath)}`);

    // Sharp processing pipeline
    await sharp(inputPath)
      .resize({
        width: 1024,
        height: 1024,
        fit: 'inside', // Maintain aspect ratio, fit inside box
        withoutEnlargement: true // Don't upscale small images
      })
      .jpeg({ 
        quality: 85, 
        progressive: true,
        mozjpeg: true 
      })
      .webp({ 
        quality: 85,
        effort: 4 // Balance speed/quality
      })
      .toFormat('webp')
      .toFile(outputPath);

    // Replace original with compressed version
    // Delete original
    await fs.unlink(inputPath);
    
    // Rename compressed to original filename
    await fs.rename(outputPath, inputPath);
    
    // Update req.file.size for logging
    const stats = await fs.stat(inputPath);
    req.file.size = stats.size;
    
    console.log(`🗜️  Image compressed: ${path.basename(inputPath)} (${stats.size / 1024} KB)`);
    
    // Update image path in req.body for controllers
    const ext = path.extname(req.file.originalname).toLowerCase();
    req.body.image = `/uploads/menu-images/${req.file.filename}`;
    
    next();
  } catch (error) {
    // Cleanup on error
    if (req.file && fs.existsSync(req.file.path)) {
      await fs.unlink(req.file.path);
    }
    next(error);
  }
};

module.exports = compressImage;

