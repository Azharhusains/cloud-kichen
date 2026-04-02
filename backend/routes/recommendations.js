const express = require('express');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../middleware/errorHandler').asyncHandler;
const { getRecommendations } = require('../controllers/recommendationController');

const router = express.Router();

router.get('/:userId', protect, asyncHandler(getRecommendations));

module.exports = router;

