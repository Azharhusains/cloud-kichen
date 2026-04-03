const Kitchen = require('../models/Kitchen');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

/**
 * Middleware to require kitchen context
 * Sets req.kitchen from:
 * 1. req.user.currentKitchen (default)
 * 2. req.params.kitchenId
 * 3. req.body.kitchenId
 */
const requireKitchenContext = async (req, res, next) => {
  try {
    console.log('KitchenAuth - req.user:', req.user ? { _id: req.user._id, role: req.user.role, currentKitchen: req.user.currentKitchen, ownedKitchens: req.user.ownedKitchens?.length } : 'NO USER');
    
    let kitchenId;
    
    // Priority 1: Explicit param/body
    if (req.params.kitchenId) {
      kitchenId = req.params.kitchenId;
    } else if (req.body.kitchenId) {
      kitchenId = req.body.kitchenId;
    } else if (req.user?.currentKitchen) {
      // Default to user's current kitchen
      kitchenId = req.user.currentKitchen;
    } else {
      return res.status(400).json({ 
        message: 'Kitchen context required. Specify kitchenId or set currentKitchen in profile.',
        debug: { userId: req.user?._id, currentKitchen: req.user?.currentKitchen }
      });
    }

    // Fetch and populate kitchen
    const kitchen = await Kitchen.findById(kitchenId)
      .populate('ownerId', 'name email role')
      .populate('teamMembers', 'name email role');
    
    if (!kitchen) {
      return res.status(404).json({ message: 'Kitchen not found' });
    }

    // Verify user access (owner/team/admin)
    const hasAccess = req.user.ownedKitchens?.includes(kitchenId) || 
                      kitchen.teamMembers.map(m => m._id.toString()).includes(req.user._id) ||
                      ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this kitchen' });
    }

    req.kitchen = kitchen;
    req.kitchenId = kitchenId;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Check subscription plan and limits
 * @param {string} [minPlan='FREE'] - Minimum plan required ('FREE'|'PRO'|'ENTERPRISE')
 * @param {string} [checkType] - Specific limit to check ('orders'|'menuItems' etc.)
 */
const checkSubscription = (minPlan = 'FREE', checkType) => {
  return async (req, res, next) => {
    try {
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
          limits: sub.kitchenId.limits
        });
      }

      req.subscription = sub;
      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
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

