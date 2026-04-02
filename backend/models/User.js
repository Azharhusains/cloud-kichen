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
  loyalty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loyalty'
  }
}, {
  timestamps: true,
});

// Production indexes:
// email: unique lookup (already indexed by unique:true, ensure compound)
userSchema.index({ email: 1 });
// role: admin queries, role-based filtering
userSchema.index({ role: 1 });

// Compare password method
userSchema.methods.comparePassword = function(candidatePassword) {
  return candidatePassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
