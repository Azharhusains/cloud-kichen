const mongoose = require('mongoose');

const aiLoggerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  voiceInput: {
    type: String,
    required: true,
    trim: true
  },
  intents: [{
    type: String,
    enum: ['add_to_cart', 'remove_item', 'select_address', 'checkout', 'payment', 'get_menu', 'unknown']
  }],
  commands: [{
    action: {
      type: String,
      required: true,
      enum: ['add_to_cart', 'remove_item', 'select_address', 'checkout', 'payment', 'get_menu']
    },
    itemName: String,
    quantity: Number,
    menuItemId: mongoose.Schema.Types.ObjectId,
    addressIndex: Number,
    addressDetails: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    success: Boolean,
    error: String
  }],
  selectedAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  cartItems: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    quantity: Number,
    itemName: String
  }],
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  response: {
    message: String,
    success: Boolean,
    orderTotal: Number
  },
  processingTime: {
    type: Number,
    default: 0
  },
  browserInfo: {
    type: String,
    default: 'Unknown'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for efficient querying
aiLoggerSchema.index({ user: 1, createdAt: -1 });
aiLoggerSchema.index({ 'commands.action': 1 });
aiLoggerSchema.index({ status: 1 });

module.exports = mongoose.model('AILogger', aiLoggerSchema);
