const mongoose = require('mongoose');

const masterOrderSchema = new mongoose.Schema({
  tableId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null  // SaaS-ready: null for single tenant
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED'],
    default: 'ACTIVE'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  finalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries: active orders by table
masterOrderSchema.index({ tableId: 1, status: 1 });
masterOrderSchema.index({ status: 1 });

module.exports = mongoose.model('MasterOrder', masterOrderSchema);

