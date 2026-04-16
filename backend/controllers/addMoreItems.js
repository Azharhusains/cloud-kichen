// 4d: Add more items to active MasterOrder (create addon SubOrder)
const Order = require('../models/Order');
const MasterOrder = require('../models/MasterOrder');
const MenuItem = require('../models/MenuItem');
const Counter = require('../models/Counter');
const { deductStock, checkStockAvailability } = require('./inventoryController');
const { getAggregatedOrder } = require('../utils/orderAggregation');

const addMoreItems = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { items, masterOrderId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }

    if (!tableNumber) {
      return res.status(400).json({ message: 'Table number required' });
    }

    // Get active MasterOrder
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
        masterOrder.status = 'COMPLETED';
        masterOrder.completedAt = new Date();
        await masterOrder.save();
        masterOrder = null;
      }
    }

    if (!masterOrder) {
      return res.status(404).json({ 
        message: `No active session for table ${tableNumber}. Complete previous session or start new.` 
      });
    }

    // Validate masterOrderId if provided
    if (masterOrderId && masterOrderId.trim() !== masterOrder._id.toString()) {
      console.log(`Master order ID mismatch: expected ${masterOrder._id}, got ${masterOrderId}`);
      return res.status(400).json({ message: 'Invalid masterOrderId for table' });
    }

    // Reuse stock/menu validation/pricing logic from createOrder
    const stockAvailable = await checkStockAvailability(items);
    if (!stockAvailable) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Price/calculate (reuse createOrder logic)
    let subtotal = 0;
    let totalCost = 0;
    let deliveryCharge = 0;  // No delivery for dine-in addons
    let taxRate = 0.05;
    
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ message: `Item ${menuItem?.name} unavailable` });
      }
      item.price = item.quantityType === 'HALF' && menuItem.halfPrice ? menuItem.halfPrice : menuItem.price;
      item.costPrice = menuItem.costPrice;
      subtotal += item.price * item.quantity;
      totalCost += item.costPrice * item.quantity;
    }

    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Get next orderNumber (reuse Counter logic from createOrder)
    const counterNow = new Date();
    const todayDateStr = counterNow.toISOString().split('T')[0];
    
    let orderCounter = await Counter.findOne({ name: 'orderNumber' });
    let addonOrderNumber;
    
    if (!orderCounter) {
      await Counter.findOneAndUpdate(
        { name: 'orderNumber' },
        { $set: { sequence: 1, lastResetDate: counterNow } },
        { upsert: true }
      );
      addonOrderNumber = 1;
    } else {
      const lastResetStr = orderCounter.lastResetDate ? new Date(orderCounter.lastResetDate).toISOString().split('T')[0] : null;
      if (!lastResetStr || lastResetStr !== todayDateStr) {
        await Counter.findOneAndUpdate(
          { name: 'orderNumber' },
          { $set: { sequence: 1, lastResetDate: counterNow } }
        );
        addonOrderNumber = 1;
      } else {
        const updatedCounter = await Counter.findOneAndUpdate(
          { name: 'orderNumber' },
          { $inc: { sequence: 1 } },
          { new: true }
        );
        addonOrderNumber = updatedCounter.sequence;
      }
    }

    const subOrder = new Order({
      user: req.user._id,
      orderNumber: addonOrderNumber,
      orderType: 'dine-in',
      tableNumber,
      masterOrderId: masterOrder._id,
      isAddon: true,
      items,
      subtotal,
      deliveryCharge,
      taxRate,
      taxAmount,
      totalAmount,
      paymentMethod: 'cash',  // Bill at end
      profit: totalAmount - totalCost - taxAmount
    });

    const createdSubOrder = await subOrder.save();

    // Deduct stock
    await deductStock(items);

    // Email/PDF optional for addons (or skip)
    // ... similar to createOrder but "Add-on confirmed"

    // Populate and emit
    const populatedSubOrder = await Order.findById(createdSubOrder._id)
      .populate('user', 'name email')
      .populate('items.menuItem');

    const io = req.app.get('io');
    const tableRoom = `table_${tableNumber}`;
    const userRoom = `user_${masterOrder._id}`;

    const subOrderPayload = {
      subOrderId: createdSubOrder._id,
      masterOrderId: masterOrder._id,
      tableId: tableNumber,
      isAddon: true,
      items: populatedSubOrder.items
    };

    io.to('adminRoom').emit('new_sub_order', subOrderPayload);
    io.to('kitchen_global').emit('new_sub_order', subOrderPayload);
    io.to(tableRoom).emit('new_sub_order', subOrderPayload);
    io.to(userRoom).emit('new_sub_order', subOrderPayload);
    io.to(userRoom).emit('master_order_updated', {
      masterOrderId: masterOrder._id,
      aggregatedItems: await getAggregatedOrder(masterOrder._id).then(a => a.aggregatedItems),
      status: 'ACTIVE'
    });

    res.status(201).json({
      subOrder: createdSubOrder,
      masterOrderId: masterOrder._id,
      message: 'Items added to your active table session!'
    });
  } catch (error) {
    console.error('addMoreItems error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = addMoreItems;

