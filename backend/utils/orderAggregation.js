const MasterOrder = require('../models/MasterOrder');
const Order = require('../models/Order');

/**
 * Get fully aggregated MasterOrder data for user-facing view
 * @param {string} masterOrderId - MasterOrder _id
 * @returns {Promise<Object>} Aggregated order with flat items
 */
async function getAggregatedOrder(masterOrderId) {
  try {
    // Fetch MasterOrder
    const masterOrder = await MasterOrder.findById(masterOrderId);
    if (!masterOrder) {
      throw new Error('MasterOrder not found');
    }

    // Fetch all SubOrders linked to this MasterOrder
    const subOrders = await Order.find({ 
      masterOrderId: masterOrder._id, 
      orderType: 'dine-in' 
    })
    .populate('user', 'name email phone')
    .populate('items.menuItem', 'name price halfPrice image description')
    .sort({ createdAt: 1 });

    if (subOrders.length === 0) {
      return {
        masterOrder,
        subOrders: [],
        aggregatedItems: [],
        aggregatedSubtotal: 0,
        aggregatedTaxAmount: 0,
        aggregatedTotalAmount: 0,
        finalAmount: masterOrder.finalAmount || 0,
        status: masterOrder.status
      };
    }

    // Aggregate items from ALL suborders (flat list for user UI)
    const aggregatedItems = subOrders.flatMap(order => 
      order.items.map(item => ({
        ...item.toObject(),
        subOrderId: order._id,
        subOrderNumber: order.orderNumber,
        isAddon: order.isAddon,
        orderStatus: order.orderStatus
      }))
    );

    // Calculate aggregated amounts (sum across all suborders)
    const aggregatedSubtotal = subOrders.reduce((sum, order) => sum + order.subtotal, 0);
    const aggregatedTaxAmount = subOrders.reduce((sum, order) => sum + order.taxAmount, 0);
    const aggregatedTotalAmount = subOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      masterOrder: masterOrder.toObject(),
      subOrders: subOrders.map(o => o.toObject()),
      aggregatedItems,
      aggregatedSubtotal,
      aggregatedTaxAmount,
      aggregatedTotalAmount,
      finalAmount: masterOrder.finalAmount || aggregatedTotalAmount,
      status: masterOrder.status,
      tableId: masterOrder.tableId
    };
  } catch (error) {
    console.error('Aggregation error:', error);
    throw error;
  }
}

/**
 * Get MasterOrder by table (create if none ACTIVE)
 * @param {string} tableNumber 
 * @param {ObjectId} userId 
 * @returns {Promise<Object>} MasterOrder
 */
async function getOrCreateMasterOrder(tableNumber, userId) {
  let masterOrder = await MasterOrder.findOne({ 
    tableId: tableNumber, 
    status: 'ACTIVE' 
  });
  
  // If we found an ACTIVE master order, verify it's really still active
  if (masterOrder && masterOrder.status === 'ACTIVE') {
    // Double-check if all suborders are already completed
    const activeSubOrders = await Order.countDocuments({ 
      masterOrderId: masterOrder._id, 
      orderStatus: { $ne: 'completed' } 
    });
    
    if (activeSubOrders === 0) {
      // All orders completed, this master order should be COMPLETED
      await MasterOrder.findByIdAndUpdate(masterOrder._id, {
        status: 'COMPLETED',
        completedAt: new Date()
      });
      masterOrder = null;
    }
  }

  if (!masterOrder) {
    // Create new ACTIVE MasterOrder
    masterOrder = new MasterOrder({
      tableId: tableNumber,
      // tenantId from req.user if multi-tenant
    });
    await masterOrder.save();
    console.log(`Created new MasterOrder ${masterOrder._id} for table ${tableNumber}`);
  }

  return masterOrder;
}

module.exports = {
  getAggregatedOrder,
  getOrCreateMasterOrder
};

