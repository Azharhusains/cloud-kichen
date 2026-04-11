const mongoose = require('mongoose');

const kitchenStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  isManual: {
    type: Boolean,
    default: false
  },
  manualBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  manualAt: {
    type: Date
  },
  note: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for fast queries
kitchenStatusSchema.index({ status: 1 });
kitchenStatusSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('KitchenStatus', kitchenStatusSchema);
