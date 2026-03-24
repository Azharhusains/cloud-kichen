const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'],
    default: 'CUSTOMER',
  },
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

// Hash password pre-save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Unique SUPER_ADMIN constraint (compound index)
userSchema.index({ role: 'SUPER_ADMIN' }, { unique: true });

module.exports = mongoose.model('User', userSchema);
