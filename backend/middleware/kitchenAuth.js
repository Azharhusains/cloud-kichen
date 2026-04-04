const Kitchen = require('../models/Kitchen');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { asyncHandler } = require('./errorHandler');

/**
 * Middleware to require kitchen context
 * Sets req.kitchen from:
 * 1. req.user.currentKitchen (default)
 * 2. req.params.kitchenId
 * 3. req.body.kitchenId
 */
const requireKitchenContext = asyncHandler(async (req, res, next) => {
  try {
    console.log('=== requireKitchenContext START ===');
    console.log('req.user:', req.user ? { _id: req.user._id, role: req.user.role, currentKitchen: req.user.currentKitchen, ownedKitchens: req.user.ownedKitchens?.length } : 'NO USER');
    console.log('req.params:', req.params);
    console.log('req.body:', req.body);
    
    if (!req.user) {
      console.log('No user - returning 401');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Skip kitchen context for CUSTOMER users - they don't need it
    if (req.user.role === 'CUSTOMER') {
      console.log('CUSTOMER user detected - skipping kitchen context requirement');
      // Allow request to proceed without kitchen context
      // Controllers will handle customer-specific logic
      return next();
    }
    
    let kitchenId;
    
    // Priority 1: Explicit param/body/query
    if (req.params.kitchenId) {
      kitchenId = req.params.kitchenId;
      console.log('Using kitchenId from params:', kitchenId);
    } else if (req.query.kitchenId) {
      kitchenId = req.query.kitchenId;
      console.log('Using kitchenId from query:', kitchenId);
    } else if (req.body.kitchenId) {
      kitchenId = req.body.kitchenId;
      console.log('Using kitchenId from body:', kitchenId);
    } else if (req.user?.currentKitchen) {
      kitchenId = req.user.currentKitchen;
      console.log('Using currentKitchen:', kitchenId);
    } else {
      console.log('No kitchen context available');
      return res.status(400).json({ 
        message: 'Kitchen context required. Specify kitchenId or set currentKitchen in profile.',
        debug: { userId: req.user?._id, currentKitchen: req.user?.currentKitchen }
      });
    }

    // Fetch and populate kitchen
    console.log('Fetching kitchen:', kitchenId);
    const kitchen = await Kitchen.findById(kitchenId)
      .populate('ownerId', 'name email role')
      .populate('teamMembers', 'name email role');
    
    if (!kitchen) {
      console.log('Kitchen not found:', kitchenId);
      return res.status(404).json({ message: 'Kitchen not found' });
    }
    console.log('Kitchen found:', kitchen._id);

    // Verify user access (owner/team/admin)
    const teamMemberIds = kitchen.teamMembers?.map(m => m._id.toString()) || [];
    const userId = req.user._id?.toString();
    console.log('Checking access - userId:', userId, 'teamMemberIds:', teamMemberIds);
    console.log('ownedKitchens:', req.user.ownedKitchens);
    console.log('user role:', req.user.role);
    
    const hasAccess = (req.user.ownedKitchens?.map(id => id.toString()) || []).includes(kitchenId.toString()) || 
                      teamMemberIds.includes(userId) ||
                      ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    
    console.log('hasAccess:', hasAccess);

    if (!hasAccess) {
      console.log('Access denied');
      return res.status(403).json({ message: 'Access denied to this kitchen' });
    }

    req.kitchen = kitchen;
    req.kitchenId = kitchenId;
    console.log('=== requireKitchenContext END ===');
    next();
  } catch (error) {
    console.error('requireKitchenContext error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Check subscription plan and limits
 * @param {string} [minPlan='FREE'] - Minimum plan required ('FREE'|'PRO'|'ENTERPRISE')
 * @param {string} [checkType] - Specific limit to check ('orders'|'menuItems' etc.)
 */
const checkSubscription = (minPlan = 'FREE', checkType) => {
  return asyncHandler(async (req, res, next) => {
    try {
      // Skip subscription check for CUSTOMER users
      if (req.user.role === 'CUSTOMER') {
        return next();
      }
      
      // Skip if no kitchenId present
      if (!req.kitchenId) {
        return next();
      }
      
      const sub = await Subscription.findOne({ kitchenId: req.kitchenId })
        .populate('kitchenId');
      
      if (!sub || sub.status !== 'active') {
        return res.status(402).json({ 
          message: 'Subscription inactive or expired. Upgrade to continue.',
          action: 'Upgrade plan'
        });
      }

      if (sub.plan < minPlan) {
        return res.status(402).json({ 
          message: `Plan upgrade required. Current: ${sub.plan}, Required: ${minPlan}`,
          action: 'Upgrade to PRO/ENTERPRISE'
        });
      }

      // Specific limit checks
      if (checkType && !await Subscription.checkLimits(req.kitchenId, checkType, req.body.count || 1)) {
        return res.status(402).json({ 
          message: `Subscription limit exceeded for ${checkType}`,
          current: sub.usage,
          limits: req.kitchen?.limits || {}
        });
      }

      req.subscription = sub;
      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

/**
 * Kitchen owner/team only
 */
const authorizeKitchenAccess = (...roles) => {
  return (req, res, next) => {
    const userRoles = ['KITCHEN_OWNER', ...roles];
    if (!userRoles.some(role => req.user.role === role) && 
        !req.user.ownedKitchens?.includes(req.kitchenId)) {
      return res.status(403).json({ message: 'Kitchen owner access required' });
    }
    next();
  };
};

module.exports = {
  requireKitchenContext,
  checkSubscription,
  authorizeKitchenAccess
};

