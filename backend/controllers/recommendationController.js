const asyncHandler = require('../middleware/errorHandler').asyncHandler;
const recommendationService = require('../services/recommendation.service');

const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  
  // Allow special global popular endpoint
  if (userId !== 'global-popular-trick') {
    // Security: userId must match authenticated user or admin/superadmin
    if (req.user._id.toString() !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      res.status(403);
      throw new Error('Access denied: Invalid user ID');
    }
  }

  const recommendations = await recommendationService.getRecommendations(userId);
  
  res.status(200).json({
    success: true,
    data: recommendations,
    message: 'AI recommendations generated successfully',
    performance: {
      userOrders: recommendations.userBased.items.length + recommendations.userBased.categories.length,
      popularCount: recommendations.popular.length,
      comboCount: recommendations.combos.length
    }
  });
});

module.exports = {
  getRecommendations
};

