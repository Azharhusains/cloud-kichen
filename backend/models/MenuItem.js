const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  supportsHalf: {
    type: Boolean,
    default: false,
  },
  fullPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  halfPrice: {
    type: Number,
    default: null,
    min: 0,
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    type: String,
    default: null,
  },
  isAvailable: {
    type: Boolean,
    default: true,
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
  },
}, {
  timestamps: true,
});

// Indexes for audit trail
menuItemSchema.index({ createdBy: 1 });
menuItemSchema.index({ updatedBy: 1, updatedAt: -1 });

// Production indexes:
// category + name: menu filtering/search by category/name
menuItemSchema.index({ category: 1, name: 1 });
// isAvailable: quick availability filtering
menuItemSchema.index({ isAvailable: 1 });

// Virtual for backward compatibility - return fullPrice as 'price'
menuItemSchema.virtual('price').get(function() {
  return this.fullPrice;
});
menuItemSchema.set('toJSON', { virtuals: true });
menuItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
