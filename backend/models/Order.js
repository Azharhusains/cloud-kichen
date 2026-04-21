const mongoose = require('mongoose');

const subOrderSchema = new mongoose.Schema({
  mainOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
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
  taxRate: {
    type: Number,
    default: 0.05,
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
  status: {
    type: String,
    enum: ['received', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'],
    default: 'received',
  },
  isCancelled: {
    type: Boolean,
    default: false,
  },
  cancelReason: {
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
  cancellationReasonUser: {
    type: String,
    default: null,
  },
  cancellationReasonAdmin: {
    type: String,
    default: null,
  },
}, { timestamps: true });

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
  // Main order status
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
  },
  // Sub orders array
  subOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubOrder',
  }],
  // Legacy fields for backward compatibility
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
    default: 0.05,
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
  },
  profit: {
    type: Number,
    default: 0,
  },
  // Payment fields
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'cod'],
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
  couponCode: {
    type: String,
    default: null
  },
  couponDiscount: {
    type: Number,
    default: 0
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
}, {
  timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);
const SubOrder = mongoose.model('SubOrder', subOrderSchema);

module.exports = { Order, SubOrder };
