const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Counter = require('../models/Counter');
const Table = require('../models/Table');
const { deductStock, checkStockAvailability, restoreStock } = require('./inventoryController');
const nodemailer = require('nodemailer');
const { generateInvoicePDF, savePDFToFile } = require('../utils/pdfGenerator');
const { generateOrderConfirmationEmail } = require('../utils/emailTemplate');
const path = require('path');
const fs = require('fs').promises;

const getOrders = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'CUSTOMER') {
      query.user = req.user._id;
    }
    if (req.query.status) {
      query.orderStatus = req.query.status;
    }
    // Filter by order type (delivery or dine-in)
    if (req.query.orderType) {
      query.orderType = req.query.orderType;
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
    if (req.user.role === 'CUSTOMER' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, saveAddress, orderType, tableNumber, paymentMethod } = req.body;
    if (paymentMethod === 'online') {
      return res.status(400).json({ message: 'Online payments must use /api/payment/create-session. Use COD for direct order creation.' });
    }
    console.log('=== CREATE ORDER DEBUG ===');
    console.log('orderType:', orderType);
    console.log('tableNumber:', tableNumber);
    console.log('saveAddress:', saveAddress);
    console.log('deliveryAddress:', deliveryAddress);
    console.log('req.user._id:', req.user._id);

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    // For dine-in orders, table number is required
    if (orderType === 'dine-in' && !tableNumber) {
      return res.status(400).json({ message: 'Table number is required for dine-in orders' });
    }

    // For delivery orders, delivery address is required
    if (orderType === 'delivery' && !deliveryAddress) {
      return res.status(400).json({ message: 'Delivery address is required for delivery orders' });
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
      // Use halfPrice if quantityType is HALF, else full price
      item.price = item.quantityType === 'HALF' && menuItem.halfPrice ? menuItem.halfPrice : menuItem.price;
      item.costPrice = menuItem.costPrice; // Cost price unchanged
      subtotal += item.price * item.quantity;
      totalCost += item.costPrice * item.quantity;
    }

    // Determine delivery charge based on order type
    // No delivery charge for dine-in orders
    let deliveryCharge = 0;
    let taxRate = 0.05;
    
    if (orderType === 'delivery') {
      deliveryCharge = 2.99; // Flat delivery charge for delivery orders
    }
    
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + deliveryCharge + taxAmount;

    const profit = totalAmount - totalCost - deliveryCharge - taxAmount;

    // Get global order number using Counter
    // Check if it's a new day (midnight) FIRST, then reset if needed before incrementing
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0]; // Get just YYYY-MM-DD
    
    // First, get the current counter to check the date
    let counter = await Counter.findOne({ name: 'orderNumber' });
    
    let orderNumber;
    
    if (!counter) {
      // No counter exists, create one starting at 1
      await Counter.findOneAndUpdate(
        { name: 'orderNumber' },
        { $set: { sequence: 1, lastResetDate: now } },
        { upsert: true }
      );
      orderNumber = 1;
    } else {
      // Check if we need to reset (new day) - compare date strings
      const lastResetDateStr = counter.lastResetDate ? new Date(counter.lastResetDate).toISOString().split('T')[0] : null;
      
      if (!lastResetDateStr || lastResetDateStr !== todayDate) {
        // It's a new day, reset to 1
        await Counter.findOneAndUpdate(
          { name: 'orderNumber' },
          { $set: { sequence: 1, lastResetDate: now } }
        );
        orderNumber = 1;
      } else {
        // Same day, increment the counter
        const updatedCounter = await Counter.findOneAndUpdate(
          { name: 'orderNumber' },
          { $inc: { sequence: 1 } },
          { new: true }
        );
        orderNumber = updatedCounter.sequence;
      }
    }

    // Create order with orderNumber and charge breakdown
    const order = new Order({
      user: req.user._id,
      orderNumber,
      orderType: orderType || 'delivery',
      tableNumber: orderType === 'dine-in' ? tableNumber : null,
      items,
      subtotal,
      deliveryCharge,
      taxRate,
      taxAmount,
      totalAmount,
      paymentMethod: 'cash',
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
      profit,
    });

    const createdOrder = await order.save();

    // ===== NEW: Generate PDF Invoice and Send Confirmation Email =====
    try {
      // Populate order for email/PDF
      const populatedOrder = await Order.findById(createdOrder._id)
        .populate('user', 'name email phone')
        .populate('items.menuItem');

      // Handle customer email (prefer DB user, fallback to request body)
      const customerEmail = populatedOrder.user?.email || req.body.customerEmail;
      const customerName = populatedOrder.user?.name || req.body.customerName;
      
      if (!customerEmail) {
        console.warn('No customer email found for order', createdOrder.orderNumber);
      } else {
        // Generate PDF buffer
        const pdfBuffer = await generateInvoicePDF(populatedOrder);
        
        // Save PDF file
        const pdfFilePath = await savePDFToFile(pdfBuffer, createdOrder.orderNumber);
        console.log(`PDF saved: ${pdfFilePath}`);

        // Build PDF download URL
        const pdfDownloadUrl = `${req.protocol}://${req.get('host')}/api/orders/${createdOrder.orderNumber}/invoice`;

        // Generate HTML email
        const htmlEmail = generateOrderConfirmationEmail(populatedOrder.toObject(), pdfDownloadUrl);

        // Create nodemailer transporter
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
          port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER || process.env.EMAIL_USER,
            pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
          },
        });

        // Email options
        const mailOptions = {
          from: process.env.EMAIL_FROM || process.env.SMTP_USER || '"Cloud Kitchen" <no-reply@cloudkitchen.com>',
          to: customerEmail,
          subject: `Order Confirmed #${createdOrder.orderNumber} — Cloud Kitchen`,
          html: htmlEmail,
          attachments: [
            {
              filename: `Invoice_#${createdOrder.orderNumber}.pdf`,
              path: pdfFilePath,
              contentType: 'application/pdf',
            },
          ],
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log(`✅ Confirmation email + PDF sent to ${customerEmail} for order #${createdOrder.orderNumber}`);
      }
    } catch (emailError) {
      console.error('Email/PDF generation failed:', emailError);
      // Don't fail the order creation on email error
    }
    // ===== END EMAIL/PDF =====

    // Deduct stock
    await deductStock(items);

    // For dine-in orders, automatically set table to occupied
    if (orderType === 'dine-in' && tableNumber) {
      await Table.findOneAndUpdate(
        { tableNumber: tableNumber },
        { status: 'occupied' }
      );
      console.log(`Table ${tableNumber} marked as occupied`);
    }

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
io.to('adminRoom').emit('revenueUpdated', populatedOrder);
    
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

    // For dine-in orders, when status is 'completed', set table back to available
    // 'completed' means customer has finished eating and left the table
    // This gives customers 25-30 minutes to eat after food is delivered
    if (order.orderType === 'dine-in' && order.tableNumber && req.body.status === 'completed') {
      await Table.findOneAndUpdate(
        { tableNumber: order.tableNumber },
        { status: 'available' }
      );
      console.log(`Table ${order.tableNumber} marked as available (order ${req.body.status})`);
    }

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
io.to('adminRoom').emit('revenueUpdated', populatedOrder);
    
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

const getInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name phone')
      .populate('items.menuItem', 'name price image description');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Authorization check
    if (req.user.role === 'CUSTOMER' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this invoice' });
    }
    
    // Format invoice data
    const invoiceData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('en-IN', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      customerName: order.user.name,
      customerPhone: order.user.phone || '',
      customerEmail: order.user.email || '',
      items: order.items.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      subtotal: order.subtotal,
      deliveryCharge: order.deliveryCharge || 0,
      taxRate: (order.taxRate * 100).toFixed(0) + '% GST',
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.orderStatus,
      // Restaurant details (customizable)
      restaurant: {
        name: 'Cloud Kitchen',
        address: '123 Gourmet Street, Food City, FC 400001',
        phone: '+91 98765 43210',
        gstin: '27ABCDE1234F1Z5', // Custom GSTIN as requested
        logo: `${req.protocol}://${req.get('host')}/assets/logo.png` // Assume logo in frontend/public/assets
      }
    };
    
    res.json(invoiceData);
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getOrderInvoicePDF = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    // Find order by orderNumber
    const order = await Order.findOne({ orderNumber: parseInt(orderNumber) })
      .populate('user', 'name email')
      .populate('items.menuItem');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Authorization: any auth user can download if order exists (admin/customer)
    if (req.user.role === 'CUSTOMER' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const fileName = `Invoice_#${orderNumber}.pdf`;
    const filePath = path.join(__dirname, '../../uploads/invoices/', fileName);
    
    // Try to serve existing file first
    try {
      await fs.access(filePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(path.resolve(filePath));
      return;
    } catch (fileError) {
      console.log('PDF file not found, generating on-the-fly:', fileError.message);
    }
    
    // Fallback: generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF invoice error:', error);
    res.status(500).json({ message: 'Failed to generate invoice PDF' });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is admin or super admin
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    
    // Check if order can be cancelled (only for customers)
    if (!isAdmin) {
      const cancellableStatuses = ['received', 'preparing'];
      if (!cancellableStatuses.includes(order.orderStatus)) {
        return res.status(400).json({ 
          message: 'Order cannot be cancelled at this stage. Only orders in received or preparing status can be cancelled.' 
        });
      }
      
      // For customers, verify they own the order
      if (order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to cancel this order' });
      }
    }

    // Admin can cancel orders at any stage, customers only at received/preparing
    const { reason, reasonUser, reasonAdmin } = req.body;

    // Update order with cancellation details
    order.orderStatus = 'cancelled';
    order.cancellationReason = reason || (isAdmin ? 'Cancelled by admin' : 'Cancelled by customer');
    
    // Store separate reasons for user-facing and admin internal notes
    if (isAdmin) {
      // Admin is cancelling - store both user-facing reason and admin note
      order.cancellationReasonUser = reasonUser || reason || 'Cancelled by admin';
      order.cancellationReasonAdmin = reasonAdmin || null;
    } else {
      // Customer is cancelling - store user reason
      order.cancellationReasonUser = reason || 'Cancelled by customer';
      order.cancellationReasonAdmin = null;
    }
    
    order.cancelledBy = req.user._id;
    order.cancelledAt = new Date();

    const updatedOrder = await order.save();

    // Universal refund for ALL online payments on cancel (customer/admin)
    if (order.paymentMethod === 'online' && order.paymentStatus === 'succeeded') {
      const PaymentController = require('./paymentController');
      const refundResult = await PaymentController.processRefund(order);
      
      if (refundResult.success) {
        console.log(`✅ Auto-refund succeeded for order ${order.orderNumber}: ${refundResult.refund.id} (${isAdmin ? 'ADMIN' : 'CUSTOMER'} cancel)`);
        // Emit refund success
        const io = req.app.get('io');
        io.to('adminRoom').emit('refundProcessed', { orderId: order._id, refundId: refundResult.refund.id });
      } else {
        console.error(`❌ Auto-refund failed for order ${order.orderNumber}:`, refundResult.error);
      }
    } else if (order.paymentMethod === 'cash') {
      // Cash payments: Mark for manual refund
      order.refundStatus = 'manual_pending';
      order.refundNotes = 'Cash refund - process manually';
      await order.save();
      console.log(`💰 Cash refund pending (manual) for order ${order.orderNumber}`);
    }

    // Restore inventory stock (only for non-delivered orders)
    if (order.orderStatus !== 'delivered') {
      await restoreStock(order.items);
    }

    // For dine-in orders, if cancelled, set table back to available
    if (order.orderType === 'dine-in' && order.tableNumber) {
      await Table.findOneAndUpdate(
        { tableNumber: order.tableNumber },
        { status: 'available' }
      );
      console.log(`Table ${order.tableNumber} marked as available (order cancelled)`);
    }

    // Populate the order for Socket.IO emission
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('user', 'name email')
      .populate('items.menuItem');

    // Emit real-time events
    const io = req.app.get('io');
    const orderRoom = `order_${order._id.toString()}`;

    // Emit to admin room
    io.to('adminRoom').emit('orderUpdated', populatedOrder);
    io.to('adminRoom').emit('revenueUpdated', populatedOrder);
    io.to('adminRoom').emit('orderCancelled', populatedOrder);

    // Emit to specific order room
    io.to(orderRoom).emit('orderStatusChanged', populatedOrder);
    io.to(orderRoom).emit('orderCancelled', populatedOrder);

    // Broadcast as fallback
    io.emit('orderStatusBroadcast', populatedOrder);
    io.emit('orderCancelledBroadcast', populatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getOrders, getOrder, createOrder, getInvoice, getOrderInvoicePDF, updateOrderStatus, cancelOrder };
