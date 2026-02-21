const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastAttempt: {
    type: Date,
    default: Date.now,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
