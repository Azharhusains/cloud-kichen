const Order = require('../models/Order');
const MasterOrder = require('../models/MasterOrder');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Counter = require('../models/Counter');
const Table = require('../models/Table');
const KitchenStatus = require('../models/KitchenStatus');
const { deductStock, checkStockAvailability, restoreStock } = require('./inventoryController');
const { getOrCreateMasterOrder, getAggregatedOrder } = require('../utils/orderAggregation');
const nodemailer = require('nodemailer');
const { generateInvoicePDF, savePDFToFile } = require('../utils/pdfGenerator');
const { generateOrderConfirmationEmail } = require('../utils/emailTemplate');
const path = require('path');
const fs = require('fs').promises;

const getOrders = async (req, res) => {
  try {
    // ========== PRODUCTION ORDER FILTERING ==========
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 50;
    const includeHistory = req.query.includeHistory === 'true';
    const statusFilter = req.query.statuses ? req.query.statuses.split(',') : ['received','preparing','ready','delivered'];
    
    let query = {};
    if (req.user.role === 'CUSTOMER') {
      query.user = req.user._id;
    }
    
    // Default date filter: last N days
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: cutoffDate };
    
    // Default active statuses, exclude cancelled always
    query.orderStatus = { $in: statusFilter, $ne: 'cancelled' };
    
    // Include completed only if explicitly requested
    if (!includeHistory) {
      query.orderStatus.$ne = 'completed';
    }
    
    // Existing filters
    if (req.query.orderType) {
      query.orderType = req.query.orderType;
    }
    
    let orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name email')
      .populate('items.menuItem');
    
    // For customers: group dine-in orders by masterOrderId to avoid showing multiple entries for same table session
    if (req.user.role === 'CUSTOMER') {
      const masterOrderMap = new Map();
      
      // First pass: collect all orders per master and find the main order (isAddon: false)
      for (const order of orders) {
        if (order.orderType === 'delivery') continue;
        if (!order.masterOrderId) continue;
        
        const masterId = order.masterOrderId.toString();
        
        if (!masterOrderMap.has(masterId)) {
          masterOrderMap.set(masterId, {
            mainOrder: null,
            addonOrders: []
          });
        }
        
        const group = masterOrderMap.get(masterId);
        if (order.isAddon === false) {
          // This is the main order for the session
          group.mainOrder = order;
        } else {
          // This is an addon order
          group.addonOrders.push(order);
        }
      }
      
       // Second pass: build the aggregated orders list
       const aggregatedOrders = [];
       const processedMasterIds = new Set();
       
       for (const order of orders) {
         // Delivery orders go straight through
         if (order.orderType === 'delivery') {
           aggregatedOrders.push(order);
           continue;
         }
         
         // Legacy dine-in orders (no masterOrderId) go straight through
         if (!order.masterOrderId) {
           aggregatedOrders.push(order);
           continue;
         }
         
         const masterId = order.masterOrderId.toString();
         
         // Skip if we already processed this master order
         if (processedMasterIds.has(masterId)) {
           continue;
         }
         
         const group = masterOrderMap.get(masterId);
         processedMasterIds.add(masterId);
         
         // Use main order if available, otherwise use first addon order as fallback
         const mainOrder = group.mainOrder || group.addonOrders[0];
         const orderObj = mainOrder.toObject();
         
         // Mark main order items with status
         orderObj.items = mainOrder.items.map(item => ({
           ...item.toObject(),
           subOrderId: mainOrder._id,
           isAddon: false,
           orderStatus: mainOrder.orderStatus,
           isCancelled: mainOrder.orderStatus === 'cancelled',
           cancellationReason: mainOrder.cancellationReasonUser || mainOrder.cancellationReason || null
         }));
         
         // If main order is cancelled, zero out its totals before adding addons
         if (mainOrder.orderStatus === 'cancelled') {
           orderObj.subtotal = 0;
           orderObj.taxAmount = 0;
           orderObj.totalAmount = 0;
         }
        
        // Merge all addon items into main order - skip the main order itself if it's in addonOrders
        for (const addonOrder of group.addonOrders) {
          // Don't add main order items again if we used an addon as fallback
          if (addonOrder._id.toString() === mainOrder._id.toString()) {
            continue;
          }
          
           if (addonOrder.items) {
             // Populate menuItem for addon order items
             await addonOrder.populate('items.menuItem');
             
             const addonItems = addonOrder.items.map(item => ({
               ...item.toObject(),
               subOrderId: addonOrder._id,
               isAddon: true,
               orderStatus: addonOrder.orderStatus,
               isCancelled: addonOrder.orderStatus === 'cancelled',
               cancellationReason: addonOrder.cancellationReasonUser || addonOrder.cancellationReason || null
             }));
             orderObj.items = [...orderObj.items, ...addonItems];
             
             // Update totals - only add non-cancelled addon orders
             if (addonOrder.orderStatus !== 'cancelled') {
               orderObj.subtotal += addonOrder.subtotal;
               orderObj.taxAmount += addonOrder.taxAmount;
               orderObj.totalAmount += addonOrder.totalAmount;
             }
           }
        }
        
        aggregatedOrders.push(orderObj);
      }
      
      orders = aggregatedOrders;
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    let order = await Order.findById(req.params.id).populate('user', 'name email').populate('items.menuItem');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (req.user.role === 'CUSTOMER' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // For dine-in orders with masterOrderId, get ALL items from all suborders
    let orderResponse = order.toObject();
    if (order.orderType === 'dine-in' && order.masterOrderId) {
      try {
        // Get ALL suborders for this master session WITH menu items pre-populated
        const allSubOrders = await Order.find({ 
          masterOrderId: order.masterOrderId
        })
        .populate('items.menuItem')
        .sort({ createdAt: 1 });
        
        if (allSubOrders.length > 0) {
          // Find the FIRST (main) order in this master session (original main order)
          const mainOrder = allSubOrders.find(o => !o.isAddon) || allSubOrders[0];
          
          // Keep original main order number
          orderResponse.orderNumber = mainOrder.orderNumber;
          orderResponse.originalOrderId = mainOrder._id;
          
           // Merge ALL items from ALL suborders
           const allItems = allSubOrders.flatMap(subOrder => 
             subOrder.items.map(item => ({
               ...item.toObject(),
               subOrderId: subOrder._id,
               isAddon: subOrder.isAddon,
               orderStatus: subOrder.orderStatus,
               isCancelled: subOrder.orderStatus === 'cancelled',
               cancellationReason: subOrder.cancellationReasonUser || subOrder.cancellationReason || null
             }))
           );
           
           orderResponse.items = allItems;
           
           // Update totals to sum of all NON-CANCELLED suborders only
           const activeOrders = allSubOrders.filter(o => o.orderStatus !== 'cancelled');
           orderResponse.subtotal = activeOrders.reduce((sum, o) => sum + o.subtotal, 0);
           orderResponse.taxAmount = activeOrders.reduce((sum, o) => sum + o.taxAmount, 0);
           orderResponse.totalAmount = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        }
        
        // Also keep aggregatedItems for backward compatibility
        const aggregated = await getMasterOrderAggregated({ params: { masterOrderId: order.masterOrderId.toString() } }, {}, () => {});
        if (aggregated && aggregated.aggregatedItems) {
          orderResponse.aggregatedItems = aggregated.aggregatedItems;
        }
      } catch (aggError) {
        console.warn('Failed to get aggregated items for order:', aggError.message);
      }
    }
    
    res.json(orderResponse);
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



// ===== NEW: Dine-In Add More Items - MasterOrder handling =====
    let masterOrderId = null;
    let isAddon = false;

    if (orderType === 'dine-in' && tableNumber) {
      // Get ACTIVE master order, if any
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
      
      // If no valid active master order, create new one
      if (!masterOrder) {
        masterOrder = new MasterOrder({ tableId: tableNumber });
        await masterOrder.save();
        console.log(`Created new MasterOrder ${masterOrder._id} for table ${tableNumber}`);
      }
      
      masterOrderId = masterOrder._id;
      
      // Check if there are ANY existing orders for this master order
      const existingOrders = await Order.countDocuments({ masterOrderId: masterOrder._id });
      
      // First order in new session = isAddon: false, subsequent = true
      isAddon = existingOrders > 0;

      await Table.findOneAndUpdate(
        { tableNumber: tableNumber },
        { status: 'occupied' }
      );
      console.log(`Table ${tableNumber} marked as occupied (MasterOrder: ${masterOrderId}, addon: ${isAddon})`);
    }

    // Create order with orderNumber and charge breakdown + MasterOrder fields
    const order = new Order({
      user: req.user._id,
      orderNumber,
      orderType: orderType || 'delivery',
      tableNumber: orderType === 'dine-in' ? tableNumber : null,
      masterOrderId,
      isAddon,
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

    const createdOrder = await order.save();

    // ===== NEW: Generate PDF Invoice and Send Confirmation Email ===== (for SubOrder)
    try {
      // Populate order for email/PDF
      const populatedOrder = await Order.findById(createdOrder._id)
        .populate('user', 'name email phone')
        .populate('items.menuItem');

      // Handle customer email (prefer DB user, fallback to request body)
      const customerEmail = populatedOrder.user?.email || req.body.customerEmail;
      const customerName = populatedOrder.user?.name || req.body.customerName;
      
      if (!customerEmail) {
        console.warn('No customer email found for SubOrder', createdOrder.orderNumber);
      } else {
        // Generate PDF buffer
        const pdfBuffer = await generateInvoicePDF(populatedOrder);
        
        // Save PDF file
        const pdfFilePath = await savePDFToFile(pdfBuffer, createdOrder.orderNumber);
        console.log(`SubOrder PDF saved: ${pdfFilePath}`);

        // Build PDF download URL
        const pdfDownloadUrl = `${req.protocol}://${req.get('host')}/api/orders/${createdOrder.orderNumber}/invoice`;

        // Generate HTML email
        const htmlEmail = generateOrderConfirmationEmail(populatedOrder.toObject(), pdfDownloadUrl);

        // Create nodemailer transporter
        const transporter = nodemailer.createTransporter({
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
          subject: `Add-On Order Confirmed #${createdOrder.orderNumber} — Table ${tableNumber} — Cloud Kitchen`,
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
        console.log(`✅ SubOrder confirmation email sent to ${customerEmail} for #${createdOrder.orderNumber}`);
      }
    } catch (emailError) {
      console.error('SubOrder email/PDF failed:', emailError);
    }

    // Deduct stock
    await deductStock(items);

    // Populate SubOrder for sockets
    const populatedSubOrder = await Order.findById(createdOrder._id)
      .populate('user', 'name email')
      .populate('items.menuItem');

    // Emit NEW sub_order events
    const io = req.app.get('io');
    const tableRoom = `table_${tableNumber}`;
    const userRoom = `user_${masterOrderId}`;
    
    const subOrderPayload = {
      subOrderId: createdOrder._id,
      masterOrderId,
      tableId: tableNumber,
      isAddon,
      items: populatedSubOrder.items
    };

    console.log(`Emitting new_sub_order to rooms: adminRoom, ${tableRoom}, ${userRoom}`);
    
    // Emit to kitchen/admin, table room, user room
    io.to('adminRoom').emit('new_sub_order', subOrderPayload);
    io.to('kitchen_global').emit('new_sub_order', subOrderPayload);
    io.to(tableRoom).emit('new_sub_order', subOrderPayload);
    io.to(userRoom).emit('new_sub_order', subOrderPayload);
    
    // Legacy events for backward compat
    io.to('adminRoom').emit('newOrder', populatedSubOrder);
    io.to('adminRoom').emit('revenueUpdated', populatedSubOrder);

    res.status(201).json({
      subOrder: createdOrder,
      masterOrderId,
      message: isAddon ? 'Items added to your table session!' : 'New table session started!'
    });
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
      
      // If this order is part of a master order, mark ALL suborders in this master session as completed
      if (order.masterOrderId) {
        await Order.updateMany(
          { masterOrderId: order.masterOrderId, orderStatus: { $ne: 'completed' } },
          { $set: { orderStatus: 'completed' } }
        );
        console.log(`Marked all suborders for master ${order.masterOrderId} as completed`);
        
        // Also mark the MasterOrder itself as COMPLETED
        const masterOrder = await MasterOrder.findByIdAndUpdate(order.masterOrderId, {
          status: 'COMPLETED',
          completedAt: new Date()
        }, { new: true });
        console.log(`MasterOrder ${order.masterOrderId} marked as COMPLETED`);
        
        // Emit master order completed event
        const io = req.app.get('io');
        io.to('adminRoom').emit('master_order_completed', {
          masterOrderId: order.masterOrderId,
          tableId: order.tableNumber
        });
        io.to(`table_${order.tableNumber}`).emit('master_order_completed', {
          masterOrderId: order.masterOrderId,
          tableId: order.tableNumber
        });
      }
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
    
    let invoiceItems = order.items;
    let invoiceSubtotal = order.subtotal;
    let invoiceTaxAmount = order.taxAmount;
    let invoiceTotalAmount = order.totalAmount;
    
    // For dine-in orders with master order, aggregate ALL items from ALL suborders
    if (order.orderType === 'dine-in' && order.masterOrderId) {
      try {
        // Get all suborders for this master session
        const allSubOrders = await Order.find({ 
          masterOrderId: order.masterOrderId 
        }).populate('items.menuItem', 'name price');
        
        // Aggregate all items
        invoiceItems = allSubOrders.flatMap(subOrder => subOrder.items);
        
        // Recalculate totals
        invoiceSubtotal = allSubOrders.reduce((sum, o) => sum + o.subtotal, 0);
        invoiceTaxAmount = allSubOrders.reduce((sum, o) => sum + o.taxAmount, 0);
        invoiceTotalAmount = allSubOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      } catch (aggError) {
        console.warn('Failed to aggregate invoice items for master order:', aggError.message);
      }
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
      items: invoiceItems.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      subtotal: invoiceSubtotal,
      deliveryCharge: order.deliveryCharge || 0,
      taxRate: (order.taxRate * 100).toFixed(0) + '% GST',
      taxAmount: invoiceTaxAmount,
      totalAmount: invoiceTotalAmount,
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
    let order = await Order.findOne({ orderNumber: parseInt(orderNumber) })
      .populate('user', 'name email')
      .populate('items.menuItem');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Authorization: any auth user can download if order exists (admin/customer)
    if (req.user.role === 'CUSTOMER' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // For dine-in orders with master order, aggregate ALL items from ALL suborders
    if (order.orderType === 'dine-in' && order.masterOrderId) {
      try {
        // Get all suborders for this master session
        const allSubOrders = await Order.find({ 
          masterOrderId: order.masterOrderId 
        }).populate('items.menuItem');
        
        // Convert to plain object to modify
        const orderObj = order.toObject();
        
        // Aggregate all items
        orderObj.items = allSubOrders.flatMap(subOrder => subOrder.items);
        
        // Recalculate totals
        orderObj.subtotal = allSubOrders.reduce((sum, o) => sum + o.subtotal, 0);
        orderObj.taxAmount = allSubOrders.reduce((sum, o) => sum + o.taxAmount, 0);
        orderObj.totalAmount = allSubOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        
        // Replace order with aggregated version
        order = orderObj;
      } catch (aggError) {
        console.warn('Failed to aggregate PDF invoice items for master order:', aggError.message);
      }
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

    // If this is a dine-in suborder, emit master order updated event to refresh all tracking pages
    if (order.masterOrderId && order.orderType === 'dine-in') {
      io.to(`user_${order.masterOrderId}`).emit('master_order_updated', {
        masterOrderId: order.masterOrderId,
        tableId: order.tableNumber
      });
    }

    // Broadcast as fallback
    io.emit('orderStatusBroadcast', populatedOrder);
    io.emit('orderCancelledBroadcast', populatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: error.message });
  }
};

const getMasterOrderByTable = require('./getMasterOrderByTable');  // 4a
const getMasterOrderAggregated = require('./getMasterOrderAggregated');  // 4e
const addMoreItems = require('./addMoreItems');
const completeMasterOrder = require('./completeMasterOrder');

const cancelMasterOrder = async (req, res) => {
  try {
    const masterOrder = await MasterOrder.findById(req.params.id);
    if (!masterOrder) {
      return res.status(404).json({ message: 'Master order not found' });
    }

    // Check if user is admin or super admin
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    
    // Find all suborders for this master order
    const subOrders = await Order.find({ masterOrderId: masterOrder._id });
    
    if (subOrders.length === 0) {
      return res.status(400).json({ message: 'No suborders found for this master order' });
    }

    // For customers, verify they own the order and at least one suborder is cancellable
    if (!isAdmin) {
      // Check if user owns the master order (all suborders should be same user)
      const firstOrder = subOrders[0];
      if (firstOrder.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to cancel this order' });
      }

      // Check if at least one suborder is cancellable
      const cancellableStatuses = ['received', 'preparing'];
      const hasCancellable = subOrders.some(order => cancellableStatuses.includes(order.orderStatus));
      
      if (!hasCancellable) {
        return res.status(400).json({ 
          message: 'Order cannot be cancelled at this stage. Only orders in received or preparing status can be cancelled.' 
        });
      }
    }

    const { reason, reasonUser, reasonAdmin } = req.body;

    // Cancel ALL suborders
    const cancelledOrders = [];
    for (const order of subOrders) {
      // Skip already cancelled orders
      if (order.orderStatus === 'cancelled') continue;

      // Only cancel cancellable statuses for customers
      if (!isAdmin) {
        const cancellableStatuses = ['received', 'preparing'];
        if (!cancellableStatuses.includes(order.orderStatus)) continue;
      }

      // Update order with cancellation details
      order.orderStatus = 'cancelled';
      order.cancellationReason = reason || (isAdmin ? 'Cancelled by admin' : 'Cancelled by customer');
      
      // Store separate reasons for user-facing and admin internal notes
      if (isAdmin) {
        order.cancellationReasonUser = reasonUser || reason || 'Cancelled by admin';
        order.cancellationReasonAdmin = reasonAdmin || null;
      } else {
        order.cancellationReasonUser = reason || 'Cancelled by customer';
        order.cancellationReasonAdmin = null;
      }
      
      order.cancelledBy = req.user._id;
      order.cancelledAt = new Date();

      await order.save();

      // Universal refund for ALL online payments on cancel (customer/admin)
      if (order.paymentMethod === 'online' && order.paymentStatus === 'succeeded') {
        const PaymentController = require('./paymentController');
        const refundResult = await PaymentController.processRefund(order);
        
        if (refundResult.success) {
          console.log(`✅ Auto-refund succeeded for order ${order.orderNumber}: ${refundResult.refund.id} (${isAdmin ? 'ADMIN' : 'CUSTOMER'} cancel)`);
        } else {
          console.error(`❌ Auto-refund failed for order ${order.orderNumber}:`, refundResult.error);
        }
      } else if (order.paymentMethod === 'cash') {
        order.refundStatus = 'manual_pending';
        order.refundNotes = 'Cash refund - process manually';
        await order.save();
        console.log(`💰 Cash refund pending (manual) for order ${order.orderNumber}`);
      }

      // Restore inventory stock (only for non-delivered orders)
      if (order.orderStatus !== 'delivered') {
        await restoreStock(order.items);
      }

      cancelledOrders.push(order);
    }

    // Mark master order as CANCELLED
    await MasterOrder.findByIdAndUpdate(masterOrder._id, {
      status: 'CANCELLED',
      cancelledAt: new Date()
    });

    // For dine-in orders, if cancelled, set table back to available
    if (masterOrder.tableId) {
      await Table.findOneAndUpdate(
        { tableNumber: masterOrder.tableId },
        { status: 'available' }
      );
      console.log(`Table ${masterOrder.tableId} marked as available (master order cancelled)`);
    }

    // Emit real-time events
    const io = req.app.get('io');
    
    // Emit master order cancelled event
    io.to('adminRoom').emit('master_order_cancelled', {
      masterOrderId: masterOrder._id,
      tableId: masterOrder.tableId,
      cancelledOrders: cancelledOrders.length
    });
    
    io.to(`table_${masterOrder.tableId}`).emit('master_order_cancelled', {
      masterOrderId: masterOrder._id,
      tableId: masterOrder.tableId
    });

    // Emit individual order cancelled events for each suborder
    for (const order of cancelledOrders) {
      const populatedOrder = await Order.findById(order._id)
        .populate('user', 'name email')
        .populate('items.menuItem');
      
      const orderRoom = `order_${order._id.toString()}`;
      
      io.to('adminRoom').emit('orderUpdated', populatedOrder);
      io.to('adminRoom').emit('revenueUpdated', populatedOrder);
      io.to('adminRoom').emit('orderCancelled', populatedOrder);
      
      io.to(orderRoom).emit('orderStatusChanged', populatedOrder);
      io.to(orderRoom).emit('orderCancelled', populatedOrder);
      
      io.emit('orderStatusBroadcast', populatedOrder);
      io.emit('orderCancelledBroadcast', populatedOrder);
    }

    res.json({
      masterOrderId: masterOrder._id,
      cancelledOrders: cancelledOrders.length,
      message: `${cancelledOrders.length} order(s) cancelled successfully`
    });
  } catch (error) {
    console.error('Error cancelling master order:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  getOrders, getOrder, createOrder, getInvoice, getOrderInvoicePDF, updateOrderStatus, cancelOrder,
  getMasterOrderByTable,
  getMasterOrderAggregated,
  // NEW: Dine-In Add More Items feature (others coming)
  addMoreItems, 
  completeMasterOrder,
  cancelMasterOrder
};
