const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
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
  modelUrl: {
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
  kitchenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kitchen',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

menuItemSchema.virtual('price').get(function() {
  return this.fullPrice;
});

menuItemSchema.index({ createdBy: 1 });
menuItemSchema.index({ updatedBy: 1, updatedAt: -1 });
menuItemSchema.index({ kitchenId: 1, category: 1, name: 1 });
menuItemSchema.index({ kitchenId: 1, isAvailable: 1 });
menuItemSchema.index({ isAvailable: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
