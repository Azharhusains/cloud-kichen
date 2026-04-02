/**
 * Rate limiting middleware for production readiness
 * Global: 100 requests / 15 minutes per IP
 * Auth routes: 10 requests / 15 minutes per IP (stricter)
 */

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `windowMs`
  message: {
    error: 'Too many requests from this IP',
    solution: 'Please try again later.',
    retryAfter: 15 // minutes
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for local dev
    return req.ip === '::1' || req.ip === '127.0.0.1';
  }
});

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per `windowMs`
  message: {
    error: 'Too many auth attempts from this IP',
    solution: 'Try again in 15 minutes.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.ip === '::1' || req.ip === '127.0.0.1';
  }
});

module.exports = {
  limiter, // Global use
  authLimiter // For /api/auth/*
};

