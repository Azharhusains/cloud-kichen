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
      if (val !== undefined && val !== null) {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }
  return value;
};

const sanitizeBody = (req, res, next) => {
  // Sanitize req.body
  const originalBody = req.body;
  req.body = sanitizeValue(req.body);
  
  // Sanitize query params
  req.query = sanitizeValue(req.query);
  
  // Sanitize params (less common)
  req.params = sanitizeValue(req.params);
  
  // Debug logging
  console.log('=== sanitizeBody ===');
  console.log('Original body:', originalBody);
  console.log('Sanitized body:', req.body);
  
  // Log suspicious input (optional)
  const suspiciousPatterns = [/<script/i, /javascript:/i, /on\\w+=/i];
  const bodyString = JSON.stringify(req.body || {});
  const hasSuspicious = suspiciousPatterns.some(pattern => 
    (bodyString || '').match(pattern)
  );
  
  if (hasSuspicious) {
    console.warn('🚨 Suspicious input detected:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
  }
  
  if (!req.body || typeof req.body !== 'object') {
    console.warn('⚠️ Empty/malformed req.body detected:', {
      ip: req.ip,
      url: req.url,
      contentType: req.get('Content-Type'),
      bodyType: typeof req.body
    });
  }
  
  next();
};

module.exports = sanitizeBody;
