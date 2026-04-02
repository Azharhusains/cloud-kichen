const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  kitchenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kitchen',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Additional indexes for audit trail
categorySchema.index({ createdBy: 1 });
categorySchema.index({ updatedBy: 1, updatedAt: -1 });

// Indexes for faster queries and audit trail
categorySchema.index({ kitchenId: 1, isActive: 1, sortOrder: 1 });
categorySchema.index({ kitchenId: 1, name: 1 });
categorySchema.index({ createdBy: 1 });
categorySchema.index({ updatedBy: 1, updatedAt: -1 });

module.exports = mongoose.model('Category', categorySchema);
