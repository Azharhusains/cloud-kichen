const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderNumber: {
    type: Number,
    required: true,
  },
  // NEW: Order type - delivery or dine-in
  orderType: {
    type: String,
    enum: ['delivery', 'dine-in'],
    default: 'delivery',
    required: true,
  },
  // NEW: Table number for dine-in orders
  tableNumber: {
    type: String,
    default: null,
  },
  kitchenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kitchen',
    required: true
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    quantityType: {
      type: String,
      enum: ['FULL', 'HALF'],
      default: 'FULL'
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 0.18,
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  orderStatus: {
    type: String,
    default: 'received',
  },
  // Cancellation fields
  cancellationReason: {
    type: String,
    default: null,
  },
  // Separate cancellation reasons for user-facing and admin internal notes
  cancellationReasonUser: {
    type: String,
    default: null,
  },
  cancellationReasonAdmin: {
    type: String,
    default: null,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    // NEW: For carbon score calculation
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  profit: {
    type: Number,
    default: 0,
  },
  // Payment fields
  paymentMethod: {
    type: String,
    enum: ['cash', 'online'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentIntentId: {
    type: String,
    default: null
  },
  transactionId: {
    type: String,
    default: null
  },
  razorpayOrderId: {
    type: String,
    default: null
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  // Premium Refund System Fields
  refundId: {
    type: String,
    default: null
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'manual_pending'],
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundedAt: {
    type: Date,
    default: null
  },
  refundNotes: {
    type: String,
    default: null
  },
  // NEW: Sustainability tracking
  carbonScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
});

// Production indexes for optimal query performance
// kitchenId + createdAt: kitchen order history
orderSchema.index({ kitchenId: 1, createdAt: -1 });
// user + kitchenId + createdAt: customer orders per kitchen
orderSchema.index({ user: 1, kitchenId: 1, createdAt: -1 });
// orderStatus + createdAt: dashboard filtering (pending/recent)
orderSchema.index({ orderStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
