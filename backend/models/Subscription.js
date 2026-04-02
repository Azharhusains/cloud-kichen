const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  kitchenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kitchen',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['FREE', 'PRO', 'ENTERPRISE'],
    default: 'FREE',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'trial', 'expired'],
    default: 'active'
  },
  currentPeriodStart: {
    type: Date,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    default: () => new Date(Date.now() + 30*24*60*60*1000) // 30 days
  },
  usage: {
    orders: { type: Number, default: 0 },
    menuItems: { type: Number, default: 0 },
    teamMembers: { type: Number, default: 0 }
  },
  paymentMethod: String,
  stripeSubscriptionId: String,
  trialUsed: { type: Boolean, default: false },
  autoRenew: { type: Boolean, default: true },
  notes: String
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ kitchenId: 1 }, { unique: true });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

// Static method to check if kitchen exceeds limits
subscriptionSchema.statics.checkLimits = async function(kitchenId, type, count) {
  const sub = await this.findOne({ kitchenId }).populate('kitchenId');
  if (!sub || sub.status !== 'active') return false;
  
  const limits = {
    FREE: { maxMonthlyOrders: 100, maxMenuItems: 50, maxTeamMembers: 2 },
    PRO: { maxMonthlyOrders: 1000, maxMenuItems: 500, maxTeamMembers: 10 },
    ENTERPRISE: { maxMonthlyOrders: Infinity, maxMenuItems: Infinity, maxTeamMembers: Infinity }
  };
  
  const limit = limits[sub.plan]?.[type];
  return typeof limit === 'number' ? count <= limit : true;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);

