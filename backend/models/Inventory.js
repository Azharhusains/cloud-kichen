const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    unique: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  minStockLevel: {
    type: Number,
    default: 10,
    min: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  kitchenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kitchen',
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
inventorySchema.index({ kitchenId: 1 });
inventorySchema.index({ createdBy: 1 });
inventorySchema.index({ updatedBy: 1, updatedAt: -1 });

module.exports = mongoose.model('Inventory', inventorySchema);
