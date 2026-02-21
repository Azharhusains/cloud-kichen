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
}, {
  timestamps: true,
});

module.exports = mongoose.model('Inventory', inventorySchema);
