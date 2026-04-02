const Loyalty = require('../models/Loyalty');

/**
 * Loyalty service with business logic
 */
const getLoyalty = async (userId) => {
  let loyalty = await Loyalty.findOne({ user: userId }).populate('history.order', 'orderNumber totalAmount');
  
  if (!loyalty) {
    // Create loyalty record if first time
    loyalty = new Loyalty({ user: userId });
    await loyalty.save();
  }
  
  return loyalty;
};

/**
 * Add points to user loyalty (earn)
 * @param {string} userId - User ID
 * @param {number} points - Points to add (Math.floor(totalAmount/10))
 * @param {string} reason - 'Order #123'
 * @param {string} orderId - Order ID for history
 */
const addPoints = async (userId, points, reason, orderId) => {
  if (points <= 0) return null;
  
  const loyalty = await getLoyalty(userId);
  
  // Add to history
  loyalty.history.push({
    type: 'earn',
    points,
    order: orderId,
    reason
  });
  
  // Update points
  const oldPoints = loyalty.points;
  loyalty.points += points;
  loyalty.tier = getTier(loyalty.points);
  
  await loyalty.save();
  
  console.log(`✅ Added ${points} points to user ${userId}. New total: ${loyalty.points} (${loyalty.tier})`);
  
  return {
    success: true,
    oldPoints,
    newPoints: loyalty.points,
    tier: loyalty.tier,
    historyEntry: loyalty.history[loyalty.history.length - 1]
  };
};

/**
 * Redeem points for discount
 * @param {string} userId 
 * @param {number} pointsToRedeem 
 * @param {string} orderId 
 * @returns discount amount (points/10)
 */
const redeemPoints = async (userId, pointsToRedeem, orderId) => {
  const loyalty = await getLoyalty(userId);
  
  if (loyalty.points < pointsToRedeem) {
    throw new Error(`Insufficient points. Available: ${loyalty.points}, Requested: ${pointsToRedeem}`);
  }
  
  // History entry
  loyalty.history.push({
    type: 'redeem',
    points: pointsToRedeem,
    order: orderId,
    reason: `Discount of ₹${(pointsToRedeem/10).toFixed(2)}`
  });
  
  // Deduct points
  const oldPoints = loyalty.points;
  loyalty.points -= pointsToRedeem;
  loyalty.tier = getTier(loyalty.points);
  
  await loyalty.save();
  
  const discount = pointsToRedeem / 10;
  
  console.log(`✅ Redeemed ${pointsToRedeem} points (${discount.toFixed(2)}₹ discount) for user ${userId}`);
  
  return {
    success: true,
    discount,
    oldPoints,
    newPoints: loyalty.points,
    tier: loyalty.tier
  };
};

/**
 * Get tier based on total points
 */
const getTier = (points) => {
  if (points >= 5000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Bronze';
};

module.exports = {
  getLoyalty,
  addPoints,
  redeemPoints,
  getTier
};

