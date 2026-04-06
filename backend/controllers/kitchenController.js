const Kitchen = require('../models/Kitchen');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { checkSubscription } = require('../middleware/kitchenAuth');

// @desc    Create new kitchen
// @route   POST /api/kitchens
// @access  Private / Kitchen Owner or Admin
const createKitchen = async (req, res) => {
  try {
    const { name, locations } = req.body;
    
    // Kitchen owners can create one kitchen initially
    const userKitchens = await Kitchen.countDocuments({ ownerId: req.user._id });
    if (userKitchens >= 3 && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Kitchen limit reached. Upgrade plan.' });
    }

    const kitchen = await Kitchen.create({
      name,
      ownerId: req.user._id,
      locations: locations || [],
      subscriptionPlan: 'FREE'
    });

    // Create default FREE subscription
    await Subscription.create({
      kitchenId: kitchen._id,
      plan: 'FREE'
    });

    // Add to user's ownedKitchens
    req.user.ownedKitchens = req.user.ownedKitchens || [];
    req.user.ownedKitchens.push(kitchen._id);
    await req.user.save();

    const populatedKitchen = await Kitchen.findById(kitchen._id)
      .populate('ownerId', 'name email')
      .populate('subscriptionPlan');

    res.status(201).json(populatedKitchen);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's kitchens
// @route   GET /api/kitchens
// @access  Private
const getMyKitchens = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const kitchens = await Kitchen.find({
      $or: [
        { ownerId: req.user._id },
        { teamMembers: req.user._id }
      ]
    }).populate('ownerId', 'name email').sort({ createdAt: -1 });

    res.json(kitchens);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Switch current kitchen
// @route   PATCH /api/kitchens/:id/switch
// @access  Private / Kitchen Owner or Team
const switchCurrentKitchen = async (req, res) => {
  try {
    const kitchen = await Kitchen.findById(req.params.id);
    if (!kitchen) {
      return res.status(404).json({ message: 'Kitchen not found' });
    }

    // Verify access
    const teamMemberIds = kitchen.teamMembers?.map(m => m._id.toString()) || [];
    const hasAccess = req.user.ownedKitchens?.includes(req.params.id) || 
                      teamMemberIds.includes(req.user._id?.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    req.user.currentKitchen = req.params.id;
    await req.user.save();

    res.json({ 
      message: 'Current kitchen switched successfully',
      currentKitchen: req.params.id 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get kitchen dashboard
// @route   GET /api/kitchens/:id/dashboard
// @access  Private / Kitchen context
const getKitchenDashboard = async (req, res) => {
  try {
    const aggregate = [
      { $match: { kitchenId: req.kitchen._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'received'] }, 1, 0] }
          }
        }
      }
    ];

    const stats = await Order.aggregate(aggregate);
    const sub = await Subscription.findOne({ kitchenId: req.kitchen._id });

    res.json({
      kitchen: req.kitchen,
      subscription: sub,
      stats: stats[0] || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0 },
      planLimits: req.kitchen.limits
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add team member
// @route   POST /api/kitchens/:id/team
// @access  Kitchen Owner
const addTeamMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check subscription limit
    await checkSubscription('PRO')(req, res); // PRO required for team >1

    req.kitchen.teamMembers.push(userId);
    await req.kitchen.save();

    res.json({ message: 'Team member added', teamMembers: req.kitchen.teamMembers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all active kitchens (public)
// @route   GET /api/kitchens/public
// @access  Public
const getAllActiveKitchens = async (req, res) => {
  try {
    const kitchens = await Kitchen.find({ status: 'active' })
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 });

    res.json(kitchens);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single kitchen by ID (public)
// @route   GET /api/kitchens/:id
// @access  Public
const getKitchenById = async (req, res) => {
  try {
    const kitchen = await Kitchen.findOne({ 
      _id: req.params.id, 
      status: 'active' 
    }).populate('ownerId', 'name email');

    if (!kitchen) {
      return res.status(404).json({ message: 'Kitchen not found' });
    }

    res.json(kitchen);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update kitchen (SUPER_ADMIN only)
// @route   PATCH /api/kitchens/:id
// @access  SUPER_ADMIN
const updateKitchen = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'SUPER_ADMIN access only' });
    }

    const { name, locations, status, ownerId } = req.body;

    const kitchen = await Kitchen.findById(req.params.id);
    if (!kitchen) {
      return res.status(404).json({ message: 'Kitchen not found' });
    }

    // Validate new owner if provided
    if (ownerId && ownerId !== kitchen.ownerId.toString()) {
      const newOwner = await User.findById(ownerId);
      if (!newOwner) {
        return res.status(400).json({ message: 'Invalid owner ID' });
      }
      kitchen.ownerId = ownerId;
    }

    if (name !== undefined) kitchen.name = name;
    if (locations !== undefined) kitchen.locations = locations;
    if (status !== undefined) {
      kitchen.status = status;
      // Sync subscription
      await Subscription.findOneAndUpdate(
        { kitchenId: kitchen._id },
        { status: status === 'active' ? 'active' : 'paused' }
      );
    }

    await kitchen.save();

    const populated = await Kitchen.findById(kitchen._id).populate('ownerId', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  createKitchen,
  getMyKitchens,
  switchCurrentKitchen,
  getKitchenDashboard,
  addTeamMember,
  getAllActiveKitchens,
  getKitchenById,
  updateKitchen
};


