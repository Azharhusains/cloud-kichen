const { getLoyalty, addPoints, redeemPoints, getTier } = require('../services/loyalty.service');
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

const getLoyaltyOverview = asyncHandler(async (req, res) => {
  const stats = await Loyalty.aggregate([
    {
      $group: {
        _id: '$tier',
        count: { $sum: 1 },
        totalPoints: { $sum: '$points' }
      }
    },
    {
      $group: {
        _id: null,
        tiers: { $push: { tier: '$_id', users: '$count', totalPoints: '$totalPoints' } },
        totalUsers: { $sum: '$count' },
        totalPoints: { $sum: '$totalPoints' }
      }
    },
    {
      $project: {
        _id: 0,
        totalUsers: 1,
        totalPoints: { $round: ['$totalPoints', 0] },
        tiers: 1
      }
    }
  ]);

  const overview = stats[0] || { totalUsers: 0, totalPoints: 0, tiers: [] };

  res.json({
    success: true,
    program: {
      earnRule: '1 point per ₹10 spent',
      redeemRule: '10 points = ₹1 discount',
      tiers: [
        { name: 'Bronze', minPoints: 0, maxPoints: 999 },
        { name: 'Silver', minPoints: 1000, maxPoints: 4999 },
        { name: 'Gold', minPoints: 5000 }
      ]
    },
    stats: overview
  });
});

/**
 * GET /api/loyalty/ - Public loyalty program overview and stats
 */

module.exports = {
  getLoyaltyInfo,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  getLoyaltyOverview
};

