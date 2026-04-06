const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Payment Intent/Session for checkout
const createPaymentSession = async (req, res) => {
  try {
    const { orderData } = req.body;
    if (!orderData) {
      return res.status(400).json({ message: 'orderData is required' });
    }
    const { items, deliveryAddress, subtotal, totalAmount } = orderData;
    
    const finalTotal = totalAmount;

    // Create Razorpay Order
    if (!rzp || !process.env.RAZORPAY_KEY_ID) {
      return res.status(503).json({ message: 'Online payments not configured. Use COD.' });
    }
    const razorpayOrder = await rzp.orders.create({
      amount: Math.round(finalTotal * 100), // paise
      currency: 'INR',
      receipt: `order_${req.user._id.toString().slice(-6)}_${Date.now().toString().slice(-6)}`,
      notes: {
        userId: req.user._id.toString(),
        orderItems: JSON.stringify(items),
        subtotal,
        deliveryAddress: deliveryAddress
      }
    });

    res.json({
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      finalTotal
    });
  } catch (error) {
    console.error('Payment session error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Verify Razorpay Payment and create order
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, deliveryAddress } = req.body;

    // Verify signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Fetch Razorpay order details
    const razorpayOrder = await rzp.orders.fetch(razorpay_order_id);
    if (razorpayOrder.status !== 'paid') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Parse notes for order data
    const notes = razorpayOrder.notes;
    const items = JSON.parse(notes.orderItems || '[]');
    const userId = notes.userId;
    const subtotal = parseFloat(notes.subtotal) || 0;

    const deliveryCharge = 2.99;
    const taxRate = 0.05;
    const taxAmount = subtotal * taxRate;
    const totalAmount = parseFloat(razorpayOrder.amount) / 100;

    // Create DB order
    // Ensure items have costPrice and populate if missing
    const MenuItem = require('../models/MenuItem');
    for (let item of items) {
      if (!item.costPrice && item.menuItem) {
        const menuItemDoc = await MenuItem.findById(item.menuItem).select('costPrice');
        item.costPrice = menuItemDoc ? menuItemDoc.costPrice : 0;
      }
    }

    // Generate orderNumber using Counter
    const Counter = require('../models/Counter');
    const counter = await Counter.findOneAndUpdate(
      { name: 'orderNumber' },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );

    const dbOrder = new Order({
      user: userId,
      kitchenId: req.user.currentKitchen,
      orderNumber: counter.sequence,
      orderType: 'delivery',
      items,
      subtotal,
      deliveryCharge,
      taxRate,
      taxAmount,
      totalAmount,
      deliveryAddress: deliveryAddress || notes.deliveryAddress,
      paymentStatus: 'succeeded',
      paymentMethod: 'online',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      transactionId: razorpay_payment_id
    });

    const savedOrder = await dbOrder.save();

    // Emit socket event
    const io = req.app.get('io');
    const populatedOrder = await Order.findById(savedOrder._id).populate('items.menuItem');
    io.to('adminRoom').emit('newOrder', populatedOrder);

    console.log('Razorpay payment verified, order created:', savedOrder.orderNumber);

    res.json({ 
      success: true, 
      orderId: savedOrder._id,
      orderNumber: savedOrder.orderNumber 
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Premium refund processing for cancelled orders
const processRefund = async (order) => {
  try {
    if (!order || order.paymentMethod !== 'online' || order.paymentStatus !== 'succeeded') {
      return { success: false, message: 'Refund not applicable' };
    }
    if (order.refundStatus === 'succeeded') {
      return { success: false, message: 'Already refunded' };
    }

    const Razorpay = require('razorpay');
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const paymentId = order.razorpayPaymentId || order.transactionId;
    if (!paymentId) {
      return { success: false, message: 'No payment ID found' };
    }

    const refund = await rzp.payments.refund(paymentId, {
      amount: Math.round(order.totalAmount * 100)
    });

    // Update order
    order.refundStatus = 'succeeded';
    order.refundId = refund.id;
    order.refundAmount = order.totalAmount;
    order.refundedAt = new Date();
    order.paymentStatus = 'cancelled';
    await order.save();

    return { success: true, refund };
  } catch (error) {
    console.error('Refund failed:', error);
    order.refundStatus = 'failed';
    order.refundNotes = error.message;
    await order.save();
    return { success: false, error: error.message };
  }
};

module.exports = { createPaymentSession, verifyPayment, processRefund };
