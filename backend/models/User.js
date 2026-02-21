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
    default: 'customer',
  },
  addresses: [{
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  }],
}, {
  timestamps: true,
});

// Compare password method
userSchema.methods.comparePassword = function(candidatePassword) {
  return candidatePassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
