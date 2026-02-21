const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { deductStock, checkStockAvailability } = require('./inventoryController');

// Helper function to generate order_id
const generateOrderId = async () => {
  try {
    // Find the most recent order across all orders (not just last 24 hours)
    const recentOrder = await Order.findOne({}).sort({ order_id: -1 });

    if (recentOrder && recentOrder.order_id) {
      // Increment the order_id by 1
      return recentOrder.order_id + 1;
    } else {
      // No orders exist, start from 1
      return 1;
    }
  } catch (error) {
    // If any error, default to 1
    console.error('Error generating order_id:', error);
    return 1;
  }
};

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

const getOrderByOrderId = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }
    
    const order = await Order.findOne({ order_id: orderId }).populate('user', 'name email').populate('items.menuItem');
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
    const { items, deliveryAddress } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    // Check stock availability
    const stockAvailable = await checkStockAvailability(items);
    if (!stockAvailable) {
      return res.status(400).json({ message: 'Insufficient stock for some items' });
    }

    // Calculate total and profit
    let totalAmount = 0;
    let totalCost = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ message: `Item ${menuItem ? menuItem.name : 'unknown'} is not available` });
      }
      item.price = menuItem.price;
      item.costPrice = menuItem.costPrice;
      totalAmount += item.price * item.quantity;
      totalCost += item.costPrice * item.quantity;
    }

    // Add delivery charge and tax (configurable)
    const deliveryCharge = 50; // Flat delivery charge
    const taxRate = 0.18; // 18% tax
    const tax = totalAmount * taxRate;
    totalAmount += deliveryCharge + tax;

    const profit = totalAmount - totalCost - deliveryCharge - tax;

    // Generate order_id
    const newOrderId = await generateOrderId();

    // Create order
    const order = new Order({
      order_id: newOrderId,
      user: req.user._id,
      items,
      totalAmount,
      deliveryAddress,
      profit,
    });

    const createdOrder = await order.save();

    // Deduct stock
    await deductStock(items);

    // Ensure order_id is included in response
    const response = createdOrder.toObject();
    response.order_id = createdOrder.order_id;
    
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.orderStatus = req.body.status;
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getOrders, getOrder, getOrderByOrderId, createOrder, updateOrderStatus };
