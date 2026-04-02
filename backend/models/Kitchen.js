const mongoose = require('mongoose');

const kitchenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kitchen name is required'],
    trim: true,
    maxlength: [100, 'Name too long']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  locations: [{
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' }
    },
    isPrimary: { type: Boolean, default: false },
    lat: Number,
    lng: Number
  }],
  subscriptionPlan: {
    type: String,
    enum: ['FREE', 'PRO', 'ENTERPRISE'],
    default: 'FREE'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'paused', 'suspended', 'cancelled'],
    default: 'active'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  limits: {
    maxMonthlyOrders: { type: Number, default: 100 }, // FREE:100, PRO:1000, ENTERPRISE:unlimited
    maxMenuItems: { type: Number, default: 50 },
    analyticsDays: { type: Number, default: 30 }, // FREE:30days, PRO:90, ENT:full
    customBranding: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false }
  },
  usage: {
    monthlyOrders: { type: Number, default: 0 },
    currentMonth: { type: String, default: new Date().toISOString().slice(0,7) } // YYYY-MM
  }
}, {
  timestamps: true
});

// Indexes
kitchenSchema.index({ ownerId: 1 });
kitchenSchema.index({ subscriptionPlan: 1, subscriptionStatus: 1 });
kitchenSchema.index({ status: 1 });
kitchenSchema.index({ 'locations.lat': 1, 'locations.lng': 1 });

// Virtuals
kitchenSchema.virtual('isPro').get(function() {
  return this.subscriptionPlan === 'PRO' || this.subscriptionPlan === 'ENTERPRISE';
});
kitchenSchema.virtual('isEnterprise').get(function() {
  return this.subscriptionPlan === 'ENTERPRISE';
});

kitchenSchema.set('toJSON', { virtuals: true });
kitchenSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Kitchen', kitchenSchema);

