const asyncHandler = require('../middleware/errorHandler').asyncHandler;
const recommendationService = require('../services/recommendation.service');

const getRecommendations = asyncHandler(async (req, res) => {
let userId = req.params.userId;
  if (!userId) {
    userId = 'global-popular-trick';
  }
  console.log('[REC] getRecommendations - userId:', JSON.stringify(userId), ', req.user exists:', !!req.user, ', path:', req.path);
  
  // Allow special global popular endpoint
  if (userId !== 'global-popular-trick') {
    // Security: userId must match authenticated user or admin/superadmin
if (!req.user) {
      res.status(401);
      throw new Error('Authentication required');
    }
    if (req.user._id.toString() !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      res.status(403);
      throw new Error('Access denied: Invalid user ID');
    }
  }

let recommendations = null;
try {
  recommendations = await recommendationService.getRecommendations(userId);
} catch (serviceErr) {
  console.error('[REC] Service error for userId', userId, ':', serviceErr.message || serviceErr);
  throw serviceErr;
}
  
  const userOrders = (recommendations?.userBased?.items?.length || 0) + (recommendations?.userBased?.categories?.length || 0);
  const popularCount = recommendations?.popular?.length || 0;
  const comboCount = recommendations?.combos?.length || 0;
  
  res.status(200).json({
    success: true,
    data: recommendations || { userBased: { items: [], categories: [] }, popular: [], combos: [], timestamp: new Date() },
    message: 'AI recommendations generated successfully',
    performance: { userOrders, popularCount, comboCount }
  });
});

module.exports = {
  getRecommendations
};

