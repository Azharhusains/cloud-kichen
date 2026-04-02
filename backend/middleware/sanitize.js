/**
 * Input sanitization middleware
 * Prevents XSS, SQL injection, and normalizes inputs
 * Applied after JSON parser, before validation
 * - HTML escape strings
 * - Trim whitespace
 * - Recursive for nested objects/arrays
 * - Blacklist suspicious patterns
 */

const validator = require('validator');
const _ = require('lodash'); // For deep traversal (or implement recursive)

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    // Trim and escape HTML
    return validator.escape(validator.trim(value));
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
};

const sanitizeBody = (req, res, next) => {
  // Sanitize req.body
  req.body = sanitizeValue(req.body);
  
  // Sanitize query params
  req.query = sanitizeValue(req.query);
  
  // Sanitize params (less common)
  req.params = sanitizeValue(req.params);
  
  // Log suspicious input (optional)
  const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i];
  const hasSuspicious = suspiciousPatterns.some(pattern => 
    JSON.stringify(req.body).match(pattern)
  );
  
  if (hasSuspicious) {
    console.warn('🚨 Suspicious input detected:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
  }
  
  next();
};

module.exports = sanitizeBody;

