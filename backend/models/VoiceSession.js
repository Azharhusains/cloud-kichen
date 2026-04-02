const mongoose = require('mongoose');

const VoiceSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  currentIntent: {
    type: String,
    enum: ['adding', 'customizing', 'confirming', 'address', 'checkout', 'idle'],
    default: 'idle'
  },
  cartState: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    itemName: String, // Fallback
    quantity: {
      type: Number,
      default: 1
    },
    size: String, // half/full/s/m/l
    customizations: {
      spice: String, // low/medium/high
      portion: String // half/full
    },
    price: Number
  }],
  lastCommand: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update updatedAt on save
VoiceSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for fast queries
VoiceSessionSchema.index({ userId: 1, currentIntent: 1 });
VoiceSessionSchema.index({ sessionId: 1 });

// Static methods
VoiceSessionSchema.statics = {
  /**
   * Get or create session for user
   */
  async getSession(userId, sessionId) {
    return this.findOneAndUpdate(
      { userId, sessionId },
      { userId, sessionId },
      { upsert: true, new: true }
    );
  },

  /**
   * Update cart state for session
   */
  async updateCart(sessionId, cartState, lastCommand = null) {
    const update = {
      cartState,
      updatedAt: new Date()
    };
    if (lastCommand) update.lastCommand = lastCommand;
    return this.findOneAndUpdate(
      { sessionId },
      update,
      { new: true }
    ).populate('cartState.menuItem');
  },

  /**
   * End session (clear cart)
   */
  async endSession(sessionId) {
    return this.findOneAndUpdate(
      { sessionId },
      { currentIntent: 'idle', cartState: [], lastCommand: null },
      { new: true }
    );
  },

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId) {
    return this.find({ userId, currentIntent: { $ne: 'idle' } })
      .sort({ updatedAt: -1 })
      .limit(5);
  }
};

const VoiceSession = mongoose.model('VoiceSession', VoiceSessionSchema);

module.exports = VoiceSession;
</xai:function_call name="read_file">
<parameter name="path">backend/models/User.js
