/**
 * Centralized error handling middleware
 * Standard JSON response format for all errors
 * Production-ready: no stack traces, consistent structure
 * Logs all errors for monitoring
 */

const logger = require('morgan'); // Reuse morgan or add winston later

const handleError = (err, req, res, next) => {
  // Log error (development vs production)
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Production Error:', {
      message: err.message,
      statusCode: err.statusCode || 500,
      ip: req.ip,
      method: req.method,
      url: req.url,
      userId: req.user?._id
    });
  } else {
    console.error('💥 Development Error:', err);
  }

  // 1. Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    return res.status(400).json({
      error: 'Validation Error',
      details: errors,
      code: 'VALIDATION_ERROR'
    });
  }

  // 2. Joi/express-validator errors (already formatted by validation middleware)
  if (err.isJoi || (err.details && err.details[0])) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details || err.errors || [{ message: 'Invalid input' }],
      code: 'VALIDATION_ERROR'
    });
  }

  // 3. JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'JWT_ERROR',
      solution: 'Please login again'
    });
  }

  // 4. MongoDB duplicate key (e.g., email exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `${field} already exists`,
      code: 'DUPLICATE_KEY',
      details: { field }
    });
  }

  // 5. Multer errors
  if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'File upload limit exceeded',
      code: 'UPLOAD_LIMIT',
      details: { maxSize: '5MB', maxCount: 1 }
    });
  }

  if (err.message.includes('Only image files')) {
    return res.status(400).json({
      error: 'Invalid file type',
      code: 'INVALID_FILE_TYPE',
      details: { allowed: 'jpeg,jpg,png,gif,webp' }
    });
  }

  // 6. Rate limit errors (handled by express-rate-limit)
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMIT',
      retryAfter: err.response?.headers?.['retry-after'] || 900 // 15min
    });
  }

  // 7. Generic server error
  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    code: err.code || 'INTERNAL_ERROR'
  });
};

// Async wrapper for controllers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  handleError,
  asyncHandler
};

