const { getLoyalty, addPoints, redeemPoints } = require('../services/loyalty.service');
const Loyalty = require('../models/Loyalty');
const asyncHandler = require('../middleware/errorHandler').asyncHandler;

/**
 * GET /api/loyalty/:userId - Get user loyalty info
 */
const getLoyaltyInfo = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Only allow own data or admin
  if (req.user._id.toString() !== userId && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  const loyalty = await getLoyalty(userId);
  res.json(loyalty);
});

/**
 * POST /api/loyalty/add-points - Add points (internal use)
 */
const addLoyaltyPoints = asyncHandler(async (req, res) => {
  const { userId, points, reason, orderId } = req.body;
  
  if (!userId || !points || !reason) {
    return res.status(400).json({ message: 'userId, points, reason required' });
  }
  
  const result = await addPoints(userId, points, reason, orderId);
  res.status(201).json(result);
});

/**
 * POST /api/loyalty/redeem - Redeem points
 */
const redeemLoyaltyPoints = asyncHandler(async (req, res) => {
  const { pointsToRedeem, orderId } = req.body;
  const userId = req.user._id.toString(); // Authenticated user
  
  if (!pointsToRedeem || pointsToRedeem <= 0) {
    return res.status(400).json({ message: 'Valid pointsToRedeem required' });
  }
  
  const result = await redeemPoints(userId, pointsToRedeem, orderId);
  res.json(result);
});

module.exports = {
  getLoyaltyInfo,
  addLoyaltyPoints,
  redeemLoyaltyPoints
};

