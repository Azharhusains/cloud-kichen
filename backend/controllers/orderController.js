const mongoose = require('mongoose');
const { Order, SubOrder } = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Counter = require('../models/Counter');
const Table = require('../models/Table');
const KitchenStatus = require('../models/KitchenStatus');
const { deductStock, checkStockAvailability, restoreStock } = require('./inventoryController');
const nodemailer = require('nodemailer');
const { generateInvoicePDF, savePDFToFile } = require('../utils/pdfGenerator');
const { generateOrderConfirmationEmail } = require('../utils/emailTemplate');
const path = require('path');
const fs = require('fs').promises;

const getOrders = async (req, res) => {
  try {
    let query = {};
    // Fix case sensitivity - convert to uppercase
    if (req.user.role?.toUpperCase() === 'CUSTOMER') {
      query.user = req.user._id;
    }
    
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN' || req.user.role?.toUpperCase() === 'SUPER_ADMIN';
    
    if (isAdmin) {
      // For admin, get all sub orders as separate kitchen tickets
       const subOrders = await SubOrder.find({})
         .populate({
           path: 'mainOrderId',
           select: 'orderNumber tableNumber user orderType subOrders deliveryAddress',
           populate: { path: 'user', select: 'name email phone addresses' }
         })
         .populate('items.menuItem')
         .sort({ createdAt: -1 });
      
      // Format sub orders to look like standard orders for backward compatibility
      const mainOrderSubOrderCounts = new Map();
      
       const formattedOrders = subOrders
         .filter(subOrder => subOrder.mainOrderId != null) // Filter out suborders with missing main order
         .map(subOrder => {
           const mainOrderId = subOrder.mainOrderId._id.toString();
           
           // Maintain counter per main order for consistent numbering
           if (!mainOrderSubOrderCounts.has(mainOrderId)) {
             mainOrderSubOrderCounts.set(mainOrderId, 0);
           }
           
           const counter = mainOrderSubOrderCounts.get(mainOrderId) + 1;
           mainOrderSubOrderCounts.set(mainOrderId, counter);
           
            return {
              ...subOrder.toObject(),
              _id: subOrder._id,
              orderNumber: `${subOrder.mainOrderId.orderNumber}-${counter}`,
              user: subOrder.mainOrderId.user,
              tableNumber: subOrder.mainOrderId.tableNumber,
              orderType: subOrder.mainOrderId.orderType,
              deliveryAddress: subOrder.mainOrderId.deliveryAddress,
              orderStatus: subOrder.status,
              isSubOrder: true,
              mainOrderId: subOrder.mainOrderId._id
            };
         });
      
      res.json(formattedOrders);
    } else {
      // For customers, get main orders with sub orders
       const orders = await Order.find(query)
         .populate('user', 'name email')
         .populate('items.menuItem')
         .populate({
           path: 'subOrders',
           populate: { path: 'items.menuItem' }
         })
         .sort({ createdAt: -1 });
      res.json(orders);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone addresses').populate('items.menuItem');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
     if (req.user.role?.toUpperCase() === 'CUSTOMER' && (!order.user || order.user._id.toString() !== req.user._id.toString())) {
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
    
    // Normalize paymentMethod: map 'cod' to 'cash' for internal logic, store original for display
    let normalizedPaymentMethod = paymentMethod;
    if (paymentMethod === 'cod') {
      normalizedPaymentMethod = 'cash';
    }
    
    if (normalizedPaymentMethod === 'online') {
      return res.status(400).json({ message: 'Online payments must use /api/payment/create-session. Use COD or Cash for direct order creation.' });
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

    // NEW: Validate table lock for dine-in orders
    if (orderType === 'dine-in' && tableNumber) {
      const table = await Table.findOne({ tableNumber });
      if (!table || !table.isActive) {
        return res.status(400).json({ message: 'Invalid table number' });
      }

      const now = new Date();
      if (table.status === 'locked') {
        // Check if lock expired or owned by current user
        if ((!table.lockExpiresAt || table.lockExpiresAt <= now) || table.lockedBy.toString() === req.user._id.toString()) {
          // Lock expired or owned: clear lock and proceed
          await Table.findOneAndUpdate(
            { tableNumber },
            { 
              status: 'available',
              lockedBy: null,
              lockExpiresAt: null 
            }
          );
          console.log(`Cleared expired/owned lock for table ${tableNumber}`);
        } else {
          // Locked by other user and still valid
          return res.status(400).json({ 
            message: `Table ${tableNumber} is temporarily locked. Please try again in a moment.` 
          });
        }
      }
    }

    // Kitchen status check - block all orders if kitchen closed
    const kitchenStatus = await KitchenStatus.findOne().sort({ updatedAt: -1 });
    if (kitchenStatus && kitchenStatus.status === 'closed') {
      return res.status(400).json({ 
        message: 'Kitchen is currently closed. Orders cannot be placed at this time. Please try again later.' 
      });
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
    // Store original paymentMethod for user-facing display, use normalized for logic
    const order = new Order({
      user: req.user._id,
      orderNumber,
      orderType: orderType || 'delivery',
      tableNumber: orderType === 'dine-in' ? tableNumber : null,
      items, // Legacy field for backward compatibility
      subtotal,
      deliveryCharge,
      taxRate,
      taxAmount,
      totalAmount,
      paymentMethod,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
      profit,
      status: 'active',
    });

    const createdOrder = await order.save();

    // Create initial sub order
    const initialSubOrder = new SubOrder({
      mainOrderId: createdOrder._id,
      items,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount: subtotal + taxAmount,
      status: 'received',
    });

    await initialSubOrder.save();
    
    // Add sub order to main order
    createdOrder.subOrders.push(initialSubOrder._id);
    await createdOrder.save();

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
       .populate('user', 'name email phone addresses')
       .populate('items.menuItem');

     // Populate initial sub order
     const populatedSubOrder = await SubOrder.findById(initialSubOrder._id)
       .populate({
         path: 'mainOrderId',
         select: 'orderNumber tableNumber user orderType deliveryAddress',
         populate: { path: 'user', select: 'name email phone addresses' }
       })
       .populate('items.menuItem');

     // Format sub order for admin
     const formattedSubOrder = {
       ...populatedSubOrder.toObject(),
       orderNumber: `${populatedOrder.orderNumber}-1`,
       user: populatedSubOrder.mainOrderId.user,
       tableNumber: populatedSubOrder.mainOrderId.tableNumber,
       orderType: populatedSubOrder.mainOrderId.orderType,
       deliveryAddress: populatedSubOrder.mainOrderId.deliveryAddress,
       orderStatus: populatedSubOrder.status,
       isSubOrder: true,
       mainOrderId: populatedSubOrder.mainOrderId._id
     };

    console.log('Emitting newOrder and subOrderCreated events to adminRoom');
    
    // Emit real-time event to admin
    const io = req.app.get('io');
    io.to('adminRoom').emit('newOrder', populatedOrder);
    io.to('adminRoom').emit('subOrderCreated', formattedSubOrder);
    io.to('adminRoom').emit('revenueUpdated', populatedOrder);
    
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error.message });
  }
};

const VALID_STATUSES = ['received', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];

const updateOrderStatus = async (req, res) => {
  try {
    // Validate and normalize status
    let newStatus = (req.body.status || '').toLowerCase().trim();
    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({ 
        message: `Invalid status: ${req.body.status}. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    // Check if this is a sub order
    const subOrder = await SubOrder.findById(req.params.id);
    
    if (subOrder) {
      // Update sub order status
      subOrder.status = newStatus;
      const updatedSubOrder = await subOrder.save();

      
       // Populate sub order
       const populatedSubOrder = await SubOrder.findById(updatedSubOrder._id)
         .populate({
           path: 'mainOrderId',
           select: 'orderNumber tableNumber user orderType subOrders status deliveryAddress',
           populate: { path: 'user', select: 'name email phone addresses' }
         })
         .populate('items.menuItem');

      // 🚀 NEW: Auto-complete mainOrder if ALL non-cancelled subOrders are 'completed'
      if (newStatus === 'completed' && populatedSubOrder.mainOrderId) {
        const mainOrderId = populatedSubOrder.mainOrderId._id;
        const mainOrder = await Order.findById(mainOrderId);
        
        if (mainOrder && mainOrder.status === 'active') {
          // Check ALL non-cancelled subOrders
          const remainingSubOrders = await SubOrder.countDocuments({
            mainOrderId: mainOrderId,
            isCancelled: false,
            status: { $ne: 'completed' }
          });

          if (remainingSubOrders === 0) {
            // ALL subOrders completed → complete mainOrder
            mainOrder.status = 'completed';
            await mainOrder.save();

            // Emit mainOrder completion
            const io = req.app.get('io');
            io.to('adminRoom').emit('mainOrderCompleted', mainOrder);
            io.to(`order_${mainOrderId.toString()}`).emit('mainOrderCompleted', mainOrder);
            io.emit('mainOrderCompletedBroadcast', mainOrder);

            console.log(`✅ Auto-completed mainOrder ${mainOrder.orderNumber} (all subOrders done)`);
          }
        }
      }
      
       // Add user and delivery address from main order
       const responseOrder = {
         ...populatedSubOrder.toObject(),
         user: populatedSubOrder.mainOrderId.user,
         deliveryAddress: populatedSubOrder.mainOrderId.deliveryAddress
       };
       
       // Emit events
       const io = req.app.get('io');
       io.to('adminRoom').emit('subOrderUpdated', responseOrder);
       io.to(`order_${populatedSubOrder.mainOrderId._id.toString()}`).emit('subOrderUpdated', responseOrder);
       io.emit('subOrderUpdatedBroadcast', responseOrder);
       
       res.json(responseOrder);
      return;
    }

    
    // Regular main order update
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    console.log('=== UPDATE ORDER STATUS DEBUG ===');
    console.log('Order ID:', req.params.id);
    console.log('Order _id:', order._id.toString());
    console.log('New Status:', req.body.status, '→ Normalized:', newStatus);
    
    order.orderStatus = newStatus;
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
      .populate('user', 'name email phone addresses')
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
     
     res.json(populatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message });
  }
};

const getInvoice = async (req, res) => {
  try {
    const mainOrder = await Order.findById(req.params.id)
      .populate('user', 'name phone email')
      .populate({
        path: 'subOrders',
        populate: {
          path: 'items.menuItem',
          select: 'name fullPrice halfPrice'
        }
      });

    if (!mainOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization check
    if (req.user.role?.toUpperCase() === 'CUSTOMER' && (!mainOrder.user || mainOrder.user._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view this invoice' });
    }

    // Filter non-cancelled suborders for calculations only
    const activeSubOrders = mainOrder.subOrders.filter(function(subOrder) { return !subOrder.isCancelled; });

    // Aggregate items from all active suborders (flat list for table, but include suborder info)
    const allItems = [];
    let subtotal = 0;
    let taxAmount = 0;

    activeSubOrders.forEach(function(subOrder, subIndex) {
      subOrder.items.forEach(function(item) {
        const displayPrice = item.quantityType === 'HALF' && item.menuItem && item.menuItem.halfPrice 
          ? item.menuItem.halfPrice 
          : item.menuItem && item.menuItem.fullPrice || item.menuItem && item.menuItem.price || item.price;
        const itemTotal = displayPrice * item.quantity;
        
        allItems.push({
          subOrderIndex: subIndex + 1,
          name: item.menuItem ? item.menuItem.name : item.name,
          quantity: item.quantity,
          quantityType: item.quantityType,
          price: displayPrice,
          total: itemTotal,
          menuItem: item.menuItem
        });
        
        subtotal += itemTotal;
        taxAmount += (itemTotal * subOrder.taxRate);
      });
    });

    // Fallback to legacy items if no suborders
    if (activeSubOrders.length === 0 && mainOrder.items && mainOrder.items.length > 0) {
      mainOrder.items.forEach(function(item) {
        const displayPrice = item.quantityType === 'HALF' && item.menuItem && item.menuItem.halfPrice 
          ? item.menuItem.halfPrice 
          : item.menuItem && item.menuItem.fullPrice || item.menuItem && item.menuItem.price || item.price;
        const itemTotal = displayPrice * item.quantity;
        
        allItems.push({
          name: item.menuItem ? item.menuItem.name : item.name,
          quantity: item.quantity,
          quantityType: item.quantityType,
          price: displayPrice,
          total: itemTotal,
          menuItem: item.menuItem
        });
        
        subtotal += itemTotal;
      });
      taxAmount = subtotal * (mainOrder.taxRate || 0.05);
    }

    const deliveryCharge = mainOrder.deliveryCharge || 0;
    const totalAmount = subtotal + taxAmount + deliveryCharge;

    // Format date
    const orderDate = new Date(mainOrder.createdAt).toLocaleDateString('en-IN', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    const invoiceData = {
      orderId: mainOrder._id,
      orderNumber: mainOrder.orderNumber,
      orderDate,
      customerName: mainOrder.user?.name || 'Customer',
      customerPhone: mainOrder.user?.phone || '',
      customerEmail: mainOrder.user?.email || '',
      subOrders: mainOrder.subOrders.map(function(subOrder, index) {
        return {
          subOrderNumber: index + 1,
          status: subOrder.status,
          items: subOrder.items.map(function(item) {
            return {
              name: item.menuItem ? item.menuItem.name : item.name,
              quantityType: item.quantityType,
              quantity: item.quantity,
              price: item.quantityType === 'HALF' && item.menuItem && item.menuItem.halfPrice 
                ? item.menuItem.halfPrice 
                : item.menuItem && item.menuItem.fullPrice || item.menuItem && item.menuItem.price || item.price,
              total: (item.quantityType === 'HALF' && item.menuItem && item.menuItem.halfPrice 
                ? item.menuItem.halfPrice 
                : item.menuItem && item.menuItem.fullPrice || item.menuItem && item.menuItem.price || item.price) * item.quantity,
              menuItem: item.menuItem
            };
          }),
          subtotal: subOrder.subtotal,
          isCancelled: subOrder.isCancelled,
          cancelReason: subOrder.cancelReason || subOrder.cancellationReasonUser
        };
      }),
      // Flat items for legacy table view (optional)
      items: allItems,
      subtotal,
      taxRate: ((mainOrder.taxRate || 0.05) * 100).toFixed(0) + '% GST',
      taxAmount: taxAmount.toFixed(2),
      deliveryCharge,
      totalAmount: totalAmount.toFixed(2),
      orderType: mainOrder.orderType,
      tableNumber: mainOrder.tableNumber,
      deliveryAddress: mainOrder.deliveryAddress,
      paymentMethod: mainOrder.paymentMethod,
      paymentStatus: mainOrder.paymentStatus,
      orderStatus: mainOrder.orderStatus || 'received',
      cancellationReason: mainOrder.cancellationReason || mainOrder.cancellationReasonUser,
      restaurant: {
        name: 'Cloud Kitchen',
        address: '123 Gourmet Street, Food City, FC 400001',
        phone: '+91 98765 43210',
        gstin: '27ABCDE1234F1Z5',
        logo: `${req.protocol}://${req.get('host')}/assets/logo.png`
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
     if (req.user.role === 'CUSTOMER' && (!order.user || order.user._id.toString() !== req.user._id.toString())) {
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
    // First check if this is a sub order
    const subOrder = await SubOrder.findById(req.params.id);
    
    if (subOrder) {
      // Forward to cancelSubOrder logic
      const { reason, reasonUser, reasonAdmin } = req.body;
      
      // Check if already cancelled
      if (subOrder.isCancelled) {
        return res.status(400).json({ message: 'Sub order is already cancelled' });
      }

      // Check permissions
      const isAdmin = req.user.role?.toUpperCase() === 'ADMIN' || req.user.role?.toUpperCase() === 'SUPER_ADMIN';
      const mainOrder = await Order.findById(subOrder.mainOrderId);
      
      if (!isAdmin) {
        // Customer can only cancel own orders
        if (!mainOrder || !mainOrder.user || mainOrder.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
        
        // Customer can only cancel received/preparing
        const cancellableStatuses = ['received', 'preparing'];
        if (!cancellableStatuses.includes(subOrder.status)) {
          return res.status(400).json({ message: 'Cannot cancel sub order at this stage' });
        }
      }

      // Update sub order
      subOrder.status = 'cancelled';
      subOrder.isCancelled = true;
      subOrder.cancelReason = reason || (isAdmin ? 'Cancelled by admin' : 'Cancelled by customer');
      subOrder.cancelledBy = req.user._id;
      subOrder.cancelledAt = new Date();

      if (isAdmin) {
        subOrder.cancellationReasonUser = reasonUser || reason || 'Cancelled by admin';
        subOrder.cancellationReasonAdmin = reasonAdmin || null;
      } else {
        subOrder.cancellationReasonUser = reason || 'Cancelled by customer';
      }

      await subOrder.save();

      // Restore stock
      await restoreStock(subOrder.items);

      // Populate for response
      const populatedSubOrder = await SubOrder.findById(req.params.id)
        .populate('items.menuItem');

      // Emit real-time events
      const io = req.app.get('io');
      io.to('adminRoom').emit('subOrderCancelled', populatedSubOrder);
      io.to(`order_${mainOrder._id.toString()}`).emit('subOrderCancelled', populatedSubOrder);
      io.emit('subOrderCancelledBroadcast', populatedSubOrder);

      res.json(populatedSubOrder);
      return;
    }
    
    // If not a sub order, check for main order
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is admin or super admin
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN' || req.user.role?.toUpperCase() === 'SUPER_ADMIN';
    
    // Check if order can be cancelled (only for customers)
    if (!isAdmin) {
      const cancellableStatuses = ['received', 'preparing'];
      if (!cancellableStatuses.includes(order.orderStatus)) {
        return res.status(400).json({ 
          message: 'Order cannot be cancelled at this stage. Only orders in received or preparing status can be cancelled.' 
        });
      }
      
       // For customers, verify they own the order
       if (!order.user || order.user.toString() !== req.user._id.toString()) {
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

// Add more items to existing main order
const addMoreToOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { mainOrderId } = req.params;
    const { items } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'No items in order' });
    }

    // Find main order
    const mainOrder = await Order.findById(mainOrderId).session(session);
    if (!mainOrder) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Main order not found' });
    }

    // Check if main order is active
    if (mainOrder.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot add items to completed order' });
    }

    // Verify user ownership (only for non-admin)
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN' || req.user.role?.toUpperCase() === 'SUPER_ADMIN';
    if (!isAdmin && mainOrder.user.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Kitchen status check
    const kitchenStatus = await KitchenStatus.findOne().sort({ updatedAt: -1 });
    if (kitchenStatus && kitchenStatus.status === 'closed') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Kitchen is currently closed' });
    }

    // Check stock availability
    const stockAvailable = await checkStockAvailability(items);
    if (!stockAvailable) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Insufficient stock for some items' });
    }

    // Calculate subtotal and cost
    let subtotal = 0;
    let totalCost = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isAvailable) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Item ${menuItem ? menuItem.name : 'unknown'} is not available` });
      }
      item.price = item.quantityType === 'HALF' && menuItem.halfPrice ? menuItem.halfPrice : menuItem.price;
      item.costPrice = menuItem.costPrice;
      subtotal += item.price * item.quantity;
      totalCost += item.costPrice * item.quantity;
    }

    const taxRate = mainOrder.taxRate || 0.05;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Create sub order
    const subOrder = new SubOrder({
      mainOrderId: mainOrder._id,
      items,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount: subtotal + taxAmount,
      status: 'received',
    });

    await subOrder.save({ session });

    // Add sub order to main order
    mainOrder.subOrders.push(subOrder._id);
    await mainOrder.save({ session });

    // Deduct stock
    await deductStock(items);

    await session.commitTransaction();

    // Populate sub order for response
    const populatedSubOrder = await SubOrder.findById(subOrder._id)
      .populate('items.menuItem');

    // Emit real-time events
    const io = req.app.get('io');
    io.to('adminRoom').emit('subOrderCreated', populatedSubOrder);
    io.to(`order_${mainOrder._id.toString()}`).emit('subOrderCreated', populatedSubOrder);
    io.emit('subOrderCreatedBroadcast', populatedSubOrder);

    res.status(201).json(populatedSubOrder);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error adding more to order:', error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Get main order with all sub orders
const getMainOrderWithSubOrders = async (req, res) => {
  try {
    const { mainOrderId } = req.params;
    
     const mainOrder = await Order.findById(mainOrderId)
       .populate('user', 'name email phone addresses')
       .populate({
         path: 'subOrders',
         populate: { path: 'items.menuItem' }
       });

    if (!mainOrder) {
      return res.status(404).json({ message: 'Main order not found' });
    }

     // Verify user ownership
     const isAdmin = req.user.role?.toUpperCase() === 'ADMIN' || req.user.role?.toUpperCase() === 'SUPER_ADMIN';
     if (!isAdmin && (!mainOrder.user || mainOrder.user._id.toString() !== req.user._id.toString())) {
       return res.status(403).json({ message: 'Not authorized' });
     }

    res.json(mainOrder);
  } catch (error) {
    console.error('Error getting main order:', error);
    res.status(500).json({ message: error.message });
  }
};

// Cancel sub order
const cancelSubOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, reasonUser, reasonAdmin } = req.body;

    const subOrder = await SubOrder.findById(id);
    if (!subOrder) {
      return res.status(404).json({ message: 'Sub order not found' });
    }

    // Check if already cancelled
    if (subOrder.isCancelled) {
      return res.status(400).json({ message: 'Sub order is already cancelled' });
    }

    // Check permissions
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN' || req.user.role?.toUpperCase() === 'SUPER_ADMIN';
    const mainOrder = await Order.findById(subOrder.mainOrderId);
    
    if (!isAdmin) {
       // Customer can only cancel own orders
       if (!mainOrder.user || mainOrder.user.toString() !== req.user._id.toString()) {
         return res.status(403).json({ message: 'Not authorized' });
       }
      
      // Customer can only cancel received/preparing
      const cancellableStatuses = ['received', 'preparing'];
      if (!cancellableStatuses.includes(subOrder.status)) {
        return res.status(400).json({ message: 'Cannot cancel sub order at this stage' });
      }
    }

    // Update sub order
    subOrder.status = 'cancelled';
    subOrder.isCancelled = true;
    subOrder.cancelReason = reason || (isAdmin ? 'Cancelled by admin' : 'Cancelled by customer');
    subOrder.cancelledBy = req.user._id;
    subOrder.cancelledAt = new Date();

    if (isAdmin) {
      subOrder.cancellationReasonUser = reasonUser || reason || 'Cancelled by admin';
      subOrder.cancellationReasonAdmin = reasonAdmin || null;
    } else {
      subOrder.cancellationReasonUser = reason || 'Cancelled by customer';
    }

    await subOrder.save();

    // Restore stock
    await restoreStock(subOrder.items);

    // Populate for response
    const populatedSubOrder = await SubOrder.findById(id)
      .populate('items.menuItem');

    // Emit real-time events
    const io = req.app.get('io');
    io.to('adminRoom').emit('subOrderCancelled', populatedSubOrder);
    io.to(`order_${mainOrder._id.toString()}`).emit('subOrderCancelled', populatedSubOrder);
    io.emit('subOrderCancelledBroadcast', populatedSubOrder);

    res.json(populatedSubOrder);
  } catch (error) {
    console.error('Error cancelling sub order:', error);
    res.status(500).json({ message: error.message });
  }
};

// Complete main order (cascade to non-cancelled sub orders)
const completeMainOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const mainOrder = await Order.findById(id).session(session);
    if (!mainOrder) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Main order not found' });
    }

    // Check if already completed
    if (mainOrder.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Main order is already completed' });
    }

    // Mark main order as completed
    mainOrder.status = 'completed';
    await mainOrder.save({ session });

    // Mark all non-cancelled sub orders as completed
    await SubOrder.updateMany(
      { 
        mainOrderId: mainOrder._id,
        isCancelled: false 
      },
      { $set: { status: 'completed' } },
      { session }
    );

    // For dine-in orders, set table back to available
    if (mainOrder.orderType === 'dine-in' && mainOrder.tableNumber) {
      await Table.findOneAndUpdate(
        { tableNumber: mainOrder.tableNumber },
        { status: 'available' },
        { session }
      );
    }

    await session.commitTransaction();

    // Get updated main order with sub orders
    const updatedMainOrder = await Order.findById(id)
      .populate('user', 'name email')
      .populate({
        path: 'subOrders',
        populate: { path: 'items.menuItem' }
      });

    // Emit real-time events
    const io = req.app.get('io');
    io.to('adminRoom').emit('mainOrderCompleted', updatedMainOrder);
    io.to(`order_${mainOrder._id.toString()}`).emit('mainOrderCompleted', updatedMainOrder);
    io.emit('mainOrderCompletedBroadcast', updatedMainOrder);

    res.json(updatedMainOrder);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing main order:', error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = { 
  getOrders, 
  getOrder, 
  createOrder, 
  getInvoice, 
  getOrderInvoicePDF, 
  updateOrderStatus, 
  cancelOrder,
  addMoreToOrder,
  getMainOrderWithSubOrders,
  cancelSubOrder,
  completeMainOrder
};
