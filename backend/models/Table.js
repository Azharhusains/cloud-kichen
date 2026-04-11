const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  capacity: {
    type: Number,
    default: 4,
    min: 1,
  },
  status: {
    type: String,
    enum: ['available', 'locked', 'occupied', 'reserved'],
    default: 'available',
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lockExpiresAt: {
    type: Date,
    default: null
  },
  qrCode: {
    type: String,
    default: null,
  },
  location: {
    type: String,
    trim: true,
  },
  isActive: {
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

// Indexes removed (duplicates with timestamps: true)

// Generate QR code URL based on table number
tableSchema.methods.generateQRCodeUrl = function(baseUrl) {
  return `${baseUrl}/table/${this.tableNumber}`;
};

module.exports = mongoose.model('Table', tableSchema);

