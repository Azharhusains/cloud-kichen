const express = require('express');
const {
  createKitchen,
  getMyKitchens,
  switchCurrentKitchen,
  getKitchenDashboard,
  addTeamMember,
  getAllActiveKitchens,
  getKitchenById,
  updateKitchen
} = require('../controllers/kitchenController');
const { protect, authorize } = require('../middleware/auth');
const { requireKitchenContext, authorizeKitchenAccess, checkSubscription } = require('../middleware/kitchenAuth');
const { kitchenCreate, addTeamMember: validateAddTeamMember } = require('../middleware/validation');

const router = express.Router();

// @desc Get all active kitchens (public)
router.get('/public', getAllActiveKitchens);

// @desc Get single kitchen by ID (public)
router.get('/:id', getKitchenById);

// @desc Create kitchen - Kitchen Owner/Admin only
// Allow SUPER_ADMIN to create without kitchen context
router.post('/', protect, (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }
  return requireKitchenContext(req, res, next);
}, (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }
  const authorizeFn = require('../middleware/kitchenAuth').authorizeKitchenAccess();
  return authorizeFn(req, res, next);
}, kitchenCreate, createKitchen);

// @desc Get my kitchens
router.get('/', protect, getMyKitchens);

// @desc Switch current kitchen
router.patch('/:id/switch', protect, switchCurrentKitchen);

// @desc Update kitchen (SUPER_ADMIN only)
router.patch('/:id', protect, authorize('SUPER_ADMIN'), updateKitchen);


// @desc Kitchen dashboard (with subscription check)
router.get('/:id/dashboard', protect, requireKitchenContext, checkSubscription(), getKitchenDashboard);

// @desc Manage team (PRO plan required)
router.post('/:id/team', protect, requireKitchenContext, checkSubscription('PRO'), authorizeKitchenAccess(), validateAddTeamMember, addTeamMember);

module.exports = router;

