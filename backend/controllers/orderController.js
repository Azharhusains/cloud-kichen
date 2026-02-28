const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { deductStock, checkStockAvailability } = require('./inventoryController');

const getOrders = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'customer') {
      query.user = req.user._id;
    }
    if (req.query.status) {
      query.orderStatus = req.query.status;
    }
    const orders = await Order.find(query).populate('user', 'name email').populate('items.menuItem').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email').populate('items.menuItem');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (req.user.role === 'customer' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, saveAddress } = req.body;

    console.log('=== CREATE ORDER DEBUG ===');
    console.log('saveAddress:', saveAddress);
    console.log('deliveryAddress:', deliveryAddress);
    console.log('req.user._id:', req.user._id);

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    // Check stock availability
    const stockAvailable = await checkStockAvailability(items);
    if (!stockAvailable) {
      return res.status(400).json({ message: 'Insufficient stock for some items' });
    }

    // Calculate subtotal and cost
    let subtotal = 0;
    let totalCost = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ message: `Item ${menuItem ? menuItem.name : 'unknown'} is not available` });
      }
      item.price = menuItem.price;
      item.costPrice = menuItem.costPrice;
      subtotal += item.price * item.quantity;
      totalCost += item.costPrice * item.quantity;
    }

    // Add delivery charge and tax (configurable) - matching frontend checkout
    const deliveryCharge = 2.99; // Flat delivery charge
    const taxRate = 0.05; // 5% tax
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + deliveryCharge + taxAmount;

    const profit = totalAmount - totalCost - deliveryCharge - taxAmount;

    // Get global order number using Counter
    const counter = await Counter.findOneAndUpdate(
      { name: 'orderNumber' },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );

    const orderNumber = counter.sequence;

    // Create order with orderNumber and charge breakdown
    const order = new Order({
      user: req.user._id,
      orderNumber,
      items,
      subtotal,
      deliveryCharge,
      taxRate,
      taxAmount,
      totalAmount,
      deliveryAddress,
      profit,
    });

    const createdOrder = await order.save();

    // Deduct stock
    await deductStock(items);

    // Save address to user profile if saveAddress is true
    if (saveAddress && deliveryAddress) {
      console.log('=== SAVING ADDRESS ===');
      const user = await User.findById(req.user._id);
      console.log('User found:', user ? 'yes' : 'no');
      if (user) {
        user.addresses.push(deliveryAddress);
        await user.save();
        console.log('Address saved! New addresses:', user.addresses);
      }
    }

    // Populate the order for Socket.IO emission
    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('user', 'name email')
      .populate('items.menuItem');

    console.log('Emitting newOrder event to adminRoom');
    
    // Emit real-time event to admin
    const io = req.app.get('io');
    io.to('adminRoom').emit('newOrder', populatedOrder);
    
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    console.log('=== UPDATE ORDER STATUS DEBUG ===');
    console.log('Order ID:', req.params.id);
    console.log('Order _id:', order._id.toString());
    console.log('New Status:', req.body.status);
    
    order.orderStatus = req.body.status;
    const updatedOrder = await order.save();

    // Populate the order for Socket.IO emission
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('user', 'name email')
      .populate('items.menuItem');

    const orderRoom = `order_${order._id.toString()}`;
    console.log('Emitting to room:', orderRoom);
    console.log('Emitting to adminRoom');
    
    // Emit real-time events
    const io = req.app.get('io');
    
    // 1. Emit to admin room
    io.to('adminRoom').emit('orderUpdated', populatedOrder);
    
    // 2. Emit to specific order room
    io.to(orderRoom).emit('orderStatusChanged', populatedOrder);
    
    // 3. BROADCAST to all clients as fallback (for debugging)
    io.emit('orderStatusBroadcast', populatedOrder);
    
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getOrders, getOrder, createOrder, updateOrderStatus };
