const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cloud-kitchen');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Define Order schema inline
const orderSchema = new mongoose.Schema({
  order_id: {
    type: Number,
    default: 0,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
    },
    quantity: Number,
    price: Number,
    costPrice: Number,
  }],
  totalAmount: Number,
  orderStatus: String,
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  profit: Number,
}, {
  timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);

const addOrderIds = async () => {
  try {
    await connectDB();

    // Find all orders without order_id or with order_id = 0
    const ordersWithoutId = await Order.find({ 
      $or: [
        { order_id: { $exists: false } },
        { order_id: 0 },
        { order_id: null }
      ]
    }).sort({ createdAt: 1 });

    console.log(`Found ${ordersWithoutId.length} orders without order_id`);

    // Get the highest existing order_id
    const highestOrder = await Order.findOne({}).sort({ order_id: -1 });
    let currentOrderId = highestOrder && highestOrder.order_id ? highestOrder.order_id : 0;

    // Update each order with a sequential order_id
    for (const order of ordersWithoutId) {
      currentOrderId++;
      order.order_id = currentOrderId;
      await order.save();
      console.log(`Updated order ${order._id} with order_id: ${currentOrderId}`);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

addOrderIds();
