// Complete MasterOrder (mark table session as completed)
const MasterOrder = require('../models/MasterOrder');
const Order = require('../models/Order');
const Table = require('../models/Table');
const { getAggregatedOrder } = require('../utils/orderAggregation');

const completeMasterOrder = async (req, res) => {
  try {
    const { masterOrderId } = req.params;

    if (!masterOrderId) {
      return res.status(400).json({ message: 'masterOrderId required' });
    }

    // Find the MasterOrder
    const masterOrder = await MasterOrder.findById(masterOrderId);
    
    if (!masterOrder) {
      return res.status(404).json({ message: 'MasterOrder not found' });
    }

    if (masterOrder.status === 'COMPLETED') {
      return res.status(400).json({ message: 'MasterOrder already completed' });
    }

    // Calculate final amount by summing all suborders
    const subOrders = await Order.find({ masterOrderId: masterOrderId });
    const finalAmount = subOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Update MasterOrder
    masterOrder.status = 'COMPLETED';
    masterOrder.completedAt = new Date();
    masterOrder.finalAmount = finalAmount;
    await masterOrder.save();

    // Mark ALL suborders in this master session as completed
    await Order.updateMany(
      { masterOrderId: masterOrderId, orderStatus: { $ne: 'completed' } },
      { $set: { orderStatus: 'completed' } }
    );
    console.log(`Marked all suborders for master ${masterOrderId} as completed`);

    // Free up the table
    if (masterOrder.tableId) {
      await Table.findOneAndUpdate(
        { tableNumber: masterOrder.tableId },
        { status: 'available' }
      );
      console.log(`Table ${masterOrder.tableId} marked as available (MasterOrder completed)`);
    }

    // Get aggregated order for response
    const aggregated = await getAggregatedOrder(masterOrderId);

    // Emit events
    const io = req.app.get('io');
    io.to('adminRoom').emit('master_order_completed', {
      masterOrderId,
      tableId: masterOrder.tableId,
      finalAmount,
      aggregated
    });
    
    io.to(`table_${masterOrder.tableId}`).emit('master_order_completed', {
      masterOrderId,
      finalAmount,
      aggregated
    });

    res.json({
      message: 'Table session completed successfully',
      masterOrder,
      aggregated
    });

  } catch (error) {
    console.error('completeMasterOrder error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = completeMasterOrder;
