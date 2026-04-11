const KitchenStatus = require('../models/KitchenStatus');

const getKitchenStatus = async (req, res) => {
  try {
    // Get latest status record
    const status = await KitchenStatus.findOne()
      .sort({ updatedAt: -1 })
      .populate('manualBy', 'name email role');

    if (!status) {
      // Default to open if no record
      return res.json({ 
        status: 'open', 
        isManual: false, 
        manualBy: null,
        note: null,
        updatedAt: new Date()
      });
    }

    const io = req.app.get('io');
    // Emit realtime update
    io.emit('kitchenStatusChanged', {
      status: status.status,
      isManual: status.isManual,
      manualBy: status.manualBy ? status.manualBy.name : null,
      note: status.note,
      updatedAt: status.updatedAt
    });
    io.to('adminRoom').emit('kitchenStatusChanged', {
      status: status.status,
      isManual: status.isManual,
      manualBy: status.manualBy ? status.manualBy.name : null,
      note: status.note,
      updatedAt: status.updatedAt
    });

    res.json(status);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleKitchenStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "open" or "closed"' });
    }

    const newStatus = new KitchenStatus({
      status,
      isManual: true,
      manualBy: req.user._id,
      note: note || ''
    });

    await newStatus.save();

    // Emit to ALL clients for instant realtime update
    const io = req.app.get('io');
    const emitStatus = {
      status: newStatus.status,
      isManual: newStatus.isManual,
      manualBy: req.user.name,
      note: newStatus.note,
      updatedAt: newStatus.updatedAt
    };
    
    io.emit('kitchenStatusChanged', emitStatus); // All clients
    io.to('adminRoom').emit('kitchenStatusChanged', emitStatus); // Admins
    
    console.log(`Kitchen toggled to ${status} by ${req.user.name}`);

    res.json({
      message: `Kitchen ${status} manually`,
      status: newStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getKitchenStatus, toggleKitchenStatus };
