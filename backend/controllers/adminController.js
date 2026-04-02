const Order = require('../models/Order');
const Kitchen = require('../models/Kitchen');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// @desc    Admin dashboard - Multi-kitchen analytics
// @route   GET /api/admin/dashboard
// @access  Admin/Super Admin
const adminDashboard = async (req, res) => {
  try {
    const match = { 
      createdAt: { 
        $gte: new Date(Date.now() - 30*24*60*60*1000) // Last 30 days
      } 
    };

    const [totalKitchens, totalUsers, orderStats, subscriptionStats] = await Promise.all([
      Kitchen.countDocuments({ status: 'active' }),
      User.countDocuments(),
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' },
            kitchens: { $addToSet: '$kitchenId' }
          }
        }
      ]),
      Subscription.aggregate([
        { 
          $lookup: {
            from: 'kitchens',
            localField: 'kitchenId',
            foreignField: '_id',
            as: 'kitchen'
          }
        },
        { $unwind: '$kitchen' },
        {
          $group: {
            _id: '$plan',
            count: { $sum: 1 },
            revenuePotential: { $sum: 1 } // Placeholder
          }
        }
      ])
    ]);

    res.json({
      stats: {
        totalKitchens,
        totalUsers,
        orders: orderStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
        activeKitchens: orderStats[0]?.kitchens?.length || 0,
        subscriptions: subscriptionStats
      },
      message: 'Admin dashboard data'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List all kitchens (admin)
// @route   GET /api/admin/kitchens
// @access  Admin/Super Admin
const listAllKitchens = async (req, res) => {
  try {
    const { page = 1, limit = 20, plan, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (plan) filter.subscriptionPlan = plan;
    if (status) filter.status = status;

    const kitchens = await Kitchen.find(filter)
      .populate('ownerId', 'name email')
      .populate('teamMembers', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Kitchen.countDocuments(filter);

    res.json({
      kitchens,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Manage kitchen (suspend/activate)
// @route   PATCH /api/admin/kitchens/:id
// @access  Admin/Super Admin
const manageKitchen = async (req, res) => {
  try {
    const { status } = req.body;
    const kitchen = await Kitchen.findById(req.params.id);

    if (!kitchen) {
      return res.status(404).json({ message: 'Kitchen not found' });
    }

    kitchen.status = status || kitchen.status;
    await kitchen.save();

    // Update subscription status
    await Subscription.findOneAndUpdate(
      { kitchenId: kitchen._id },
      { status: status === 'active' ? 'active' : 'paused' }
    );

    const populated = await Kitchen.findById(kitchen._id).populate('ownerId');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  adminDashboard,
  listAllKitchens,
  manageKitchen
};

