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

    // Real-time: Emit updated user list to admin room + broadcast
    const io = req.app.get('io');
    io.to('adminRoom').emit('usersListUpdated', usersWithStats);
    io.emit('usersListUpdated', usersWithStats);

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
    const promotedUser = await targetUser.save();
    
    // Real-time: Emit single user update + refresh list
    const io = req.app.get('io');
    io.to('adminRoom').emit('userUpdated', promotedUser);
    io.emit('userUpdated', promotedUser);
    io.to('adminRoom').emit('usersListUpdated', await getAllUsersWithStats());
    io.emit('usersListUpdated', await getAllUsersWithStats());

    res.json({
      message: 'User promoted to Admin successfully',
      user: promotedUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function getAllUsersWithStats() {
  const User = require('../models/User');
  const users = await User.find({})
    .select('-password')
    .sort({ createdAt: -1 });
  
  return await Promise.all(users.map(async (user) => ({
    ...user._doc,
    orderCount: user.orderCount || 0
  })));
}

module.exports = { getUsers, promoteToAdmin };

