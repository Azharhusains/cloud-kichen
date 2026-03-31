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
    enum: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'],
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
}, {
  timestamps: true,
});

// Compare password method
userSchema.methods.comparePassword = function(candidatePassword) {
  return candidatePassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
