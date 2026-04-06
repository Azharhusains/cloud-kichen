const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['CUSTOMER', 'KITCHEN_OWNER', 'ADMIN', 'SUPER_ADMIN'],
    default: 'CUSTOMER'
  },
  resetToken: String,
  resetTokenExpiry: Date,

  addresses: [{
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  }],
  orderCount: {
    type: Number,
    default: 0,
  },
  currentKitchen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kitchen'
  },
  ownedKitchens: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kitchen'
  }]
}, {
  timestamps: true,
});

// Production indexes:
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ currentKitchen: 1 });
userSchema.index({ 'ownedKitchens': 1 });

// Compare password method
userSchema.methods.comparePassword = function(candidatePassword) {
  return candidatePassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
