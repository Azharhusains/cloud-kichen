const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.log('JWT verify failed - likely secret mismatch. Token payload:', token.split('.')[1] ? JSON.parse(atob(token.split('.')[1])) : 'invalid');
        return res.status(401).json({ message: 'Not authorized, token failed - secret mismatch?' });
      }
      console.log('protect - decoded user id:', decoded.id);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        console.log('User not found for decoded.id:', decoded.id);
        return res.status(404).json({ message: 'User not found in database' });
      }
      console.log('protect - user found:', req.user._id, 'role:', req.user.role);
      next();
    } catch (error) {
      console.log('Auth error:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'User role not authorized' });
    }
    next();
  };
};

module.exports = { 
  protect, 
  authorize,
  // Kitchen-aware auth chains
  protectWithKitchen: [protect, require('../middleware/kitchenAuth').requireKitchenContext],
  adminWithKitchen: [protect, require('../middleware/kitchenAuth').requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN')],
  kitchenOwner: [protect, require('../middleware/kitchenAuth').requireKitchenContext, require('../middleware/kitchenAuth').authorizeKitchenAccess()],
  // For creating a kitchen - requires KITCHEN_OWNER or ADMIN/SUPER_ADMIN role but NO kitchen context needed
  canCreateKitchen: [protect, authorize('KITCHEN_OWNER', 'ADMIN', 'SUPER_ADMIN')]
};
