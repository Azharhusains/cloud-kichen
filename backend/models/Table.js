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
    enum: ['available', 'occupied', 'reserved'],
    default: 'available',
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
}, {
  timestamps: true,
});

// Generate QR code URL based on table number
tableSchema.methods.generateQRCodeUrl = function(baseUrl) {
  return `${baseUrl}/table/${this.tableNumber}`;
};

module.exports = mongoose.model('Table', tableSchema);

