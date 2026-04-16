// 4a: Get MasterOrder by table (ACTIVE preferred)
const MasterOrder = require('../models/MasterOrder');

const getMasterOrderByTable = async (req, res) => {
  try {
    const { tableNumber } = req.params;

    if (!tableNumber) {
      return res.status(400).json({ message: 'Table number required' });
    }

    // Find ACTIVE MasterOrder for table
    const masterOrder = await MasterOrder.findOne({ 
      tableId: tableNumber, 
      status: 'ACTIVE' 
    }).sort({ createdAt: -1 });

    if (!masterOrder) {
      return res.status(404).json({ 
        message: `No active session for table ${tableNumber}. Start new order from menu.` 
      });
    }

    res.json({
      masterOrderId: masterOrder._id,
      tableId: masterOrder.tableId,
      status: masterOrder.status,
      message: 'Active session found'
    });
  } catch (error) {
    console.error('getMasterOrderByTable error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = getMasterOrderByTable;

