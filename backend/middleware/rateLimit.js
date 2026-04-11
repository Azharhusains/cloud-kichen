const rateLimit = require('express-rate-limit');

// Auth specific: 100 requests per hour per IP
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: {
    error: 'Too many login attempts from this IP, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

// General API: 1000 requests per hour per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: {
    error: 'Too many requests from this IP'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Rate limit exceeded, try again later.' });
  }
});

module.exports = { authLimiter, apiLimiter };
