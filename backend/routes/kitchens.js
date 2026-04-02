const express = require('express');
const {
  createKitchen,
  getMyKitchens,
  switchCurrentKitchen,
  getKitchenDashboard,
  addTeamMember
} = require('../controllers/kitchenController');
const { protect, kitchenOwner } = require('../middleware/auth');
const { requireKitchenContext, authorizeKitchenAccess, checkSubscription } = require('../middleware/kitchenAuth');
const validateRequest = require('../middleware/validation').validateRequest;

const router = express.Router();

// Kitchen schemas for validation
const createKitchenSchema = require('../middleware/validation').kitchenCreate;
const addTeamMemberSchema = require('../middleware/validation').addTeamMember;

// @desc Create kitchen - Kitchen Owner/Admin only
router.post('/', protect, kitchenOwner, validateRequest(createKitchenSchema), createKitchen);

// @desc Get my kitchens
router.get('/', protect, getMyKitchens);

// @desc Switch current kitchen
router.patch('/:id/switch', protect, requireKitchenContext, switchCurrentKitchen);

// @desc Kitchen dashboard (with subscription check)
router.get('/:id/dashboard', protect, requireKitchenContext, checkSubscription(), getKitchenDashboard);

// @desc Manage team (PRO plan required)
router.post('/:id/team', protect, requireKitchenContext, checkSubscription('PRO'), authorizeKitchenAccess(), validateRequest(addTeamMemberSchema), addTeamMember);

module.exports = router;

