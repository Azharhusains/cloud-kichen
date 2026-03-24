const User = require('../models/User');

// Get users list (paginated, search, filter by role) - ADMIN+
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const roleFilter = req.query.role || ''; // CUSTOMER, ADMIN, SUPER_ADMIN

    const query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };

    if (roleFilter && roleFilter !== 'all') {
      query.role = roleFilter;
    }

    // Exclude SUPER_ADMIN from regular searches unless current user is SUPER_ADMIN
    if (req.user.role !== 'SUPER_ADMIN') {
      query.role = { $ne: 'SUPER_ADMIN' };
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user role - strict authorization
const updateUserRole = async (req, res) => {
  try {
    const { role: newRole } = req.body;
    const normalizedNewRole = newRole.toUpperCase();

    if (!['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'].includes(normalizedNewRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const targetUser = await User.findById(req.params.id).select('role');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUserRole = req.user.role;

    // Can't modify self unless SUPER_ADMIN
    if (targetUser._id.toString() === req.user.id && currentUserRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Cannot modify own role' });
    }

    // ADMIN cannot modify SUPER_ADMIN
    if (currentUserRole === 'ADMIN' && targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Cannot modify SUPER_ADMIN role' });
    }

    // SUPER_ADMIN demotion check
    if (targetUser.role === 'SUPER_ADMIN' && normalizedNewRole !== 'SUPER_ADMIN') {
      const superAdminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (superAdminCount === 1) {
        return res.status(403).json({ message: 'Cannot demote the only SUPER_ADMIN' });
      }
    }

    // SUPER_ADMIN creation check
    if (normalizedNewRole === 'SUPER_ADMIN') {
      const superAdminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (superAdminCount > 0 && currentUserRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Only SUPER_ADMIN can create another SUPER_ADMIN' });
      }
    }

    targetUser.role = normalizedNewRole;
    const updatedUser = await targetUser.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      message: 'Role updated successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(403).json({ message: 'Only one SUPER_ADMIN allowed' });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, updateUserRole };
