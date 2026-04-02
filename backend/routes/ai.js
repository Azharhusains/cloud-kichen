/**
 * AI Engine Routes
 * Provides endpoints for voice command processing
 */

const express = require('express');
const router = express.Router();
const AIEngine = require('../modules/ai-engine');
const { protect } = require('../middleware/auth');

/**
 * POST /api/ai/process
 * Process voice command
 * Body: { voiceInput: string, cart?: array, selectedAddress?: object }
 */
router.post('/process', protect, async (req, res) => {
  try {
    const { voiceInput, cart, selectedAddress, browserInfo } = req.body;

    // Validate voice input
    if (!voiceInput || typeof voiceInput !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Voice input is required'
      });
    }

    // Additional input validation
    if (voiceInput.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Voice input is too long. Maximum 500 characters allowed.'
      });
    }

    // Process the voice command
    const result = await AIEngine.process(
      voiceInput,
      req.user._id,
      {
        cart: cart || [],
        selectedAddress,
        browserInfo: browserInfo || req.headers['user-agent']
      }
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('AI Process Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process voice command',
      error: error.message
    });
  }
});

/**
 * GET /api/ai/menu
 * Get available menu items
 * Query: ?category=string
 */
router.get('/menu', protect, async (req, res) => {
  try {
    const { category } = req.query;
    const result = await AIEngine.getMenu(category);
    
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('AI Menu Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu',
      items: []
    });
  }
});

/**
 * GET /api/ai/addresses
 * Get user addresses for voice selection
 */
router.get('/addresses', protect, async (req, res) => {
  try {
    const result = await AIEngine.getUserAddresses(req.user._id);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('AI Addresses Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch addresses',
      addresses: []
    });
  }
});

/**
 * GET /api/ai/history
 * Get user's AI command history
 * Query: ?limit=number
 */
router.get('/history', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const history = await AIEngine.getUserHistory(req.user._id, limit);
    
    res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error('AI History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      history: []
    });
  }
});

/**
 * GET /api/ai/stats
 * Get AI engine statistics (admin only)
 */
router.get('/stats', protect, async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const stats = await AIEngine.getStats();
    
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('AI Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      stats: {}
    });
  }
});

/**
 * POST /api/ai/process-voice (NEW - Multi-turn voice with sessions)
 * Body: { voiceInput: string, sessionId?: string }
 */
router.post('/process-voice', protect, async (req, res) => {
  try {
    const { voiceInput, sessionId } = req.body;
    if (!voiceInput) {
      return res.status(400).json({ success: false, message: 'Voice input required' });
    }

    const VoiceService = require('../services/voice.service');
    const result = await VoiceService.processVoice(voiceInput, req.user._id, sessionId);

    res.json(result);
  } catch (error) {
    console.error('Voice process error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ai/voice-session (NEW - Session management)
 * Body: { sessionId?: string } - returns/creates session
 */
router.post('/voice-session', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const VoiceSession = require('../models/VoiceSession');
    const VoiceService = require('../services/voice.service');
    
    let session;
    if (sessionId) {
      session = await VoiceSession.findOne({ sessionId, userId: req.user._id });
    }
    
    if (!session) {
      const newSessionId = VoiceService.generateSessionId(req.user._id);
      session = await VoiceSession.getSession(req.user._id, newSessionId);
    }

    res.json({
      success: true,
      sessionId: session.sessionId,
      cartItems: session.cartState || [],
      currentIntent: session.currentIntent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
