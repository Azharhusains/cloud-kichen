const User = require('../models/User');

const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Add order count for each user (optional enhancement)
    const usersWithStats = await Promise.all(users.map(async (user) => {
      // Note: orderCount field exists in User model, use it directly
      return {
        ...user._doc,
        orderCount: user.orderCount || 0
      };
    }));

    res.json(usersWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const promoteToAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify target user exists and is not already ADMIN/SUPER_ADMIN
    const targetUser = await User.findById(id).select('-password');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      return res.status(400).json({ message: 'User already has admin privileges' });
    }
    
    // Only SUPER_ADMIN can promote
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only Super Admin can promote users to Admin' });
    }
    
    // Promote to ADMIN
    targetUser.role = 'ADMIN';
    await targetUser.save();
    
    res.json({
      message: 'User promoted to Admin successfully',
      user: targetUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, promoteToAdmin };

