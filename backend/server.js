const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('./middleware/rateLimit');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Connect to database
// Wait for DB before starting server (async)
connectDB().catch(err => {
  console.error('DB connection failed:', err.message);
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const Table = require('./models/Table');
const KitchenStatus = require('./models/KitchenStatus');
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL] : 'https://cloud-kitchen.netlify.app',
    methods: ['GET', 'POST'],
    credentials: true
  }
});


// Make io accessible to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  // Join rooms based on user role
  socket.on('joinAdmin', () => {
    socket.join('adminRoom');
    console.log('Client joined admin room:', socket.id);
  });

  socket.on('joinOrder', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Client joined order room: order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// NEW: Auto-unlock expired table locks (every 10 seconds)
setInterval(async () => {
  try {
    const io = app.get('io');
    const now = new Date();
    
    const expiredLocks = await Table.find({
      status: 'locked',
      lockExpiresAt: { $lt: now }
    });

    for (const table of expiredLocks) {
      await Table.findByIdAndUpdate(table._id, {
        status: 'available',
        lockedBy: null,
        lockExpiresAt: null
      });

      // Emit unlock event
      io.emit('table_unlocked', {
        tableId: table._id,
        tableNumber: table.tableNumber
      });
      io.to('adminRoom').emit('tableStatusChanged', table);

      console.log(`Auto-unlocked expired table ${table.tableNumber}`);
    }
  } catch (error) {
  console.error('Auto-unlock cron error:', error);
  }
}, 10000); // 10 seconds

// NEW: Periodic health updates via socket (every 30 seconds)
setInterval(async () => {
  try {
    const io = app.get('io');
    
    // Get current kitchen status
    const kitchenStatus = await KitchenStatus.findOne().sort({ updatedAt: -1 });
    
    const healthData = {
      server: 'healthy',
      database: 'healthy',
      timestamp: new Date().toISOString(),
      kitchen: kitchenStatus ? kitchenStatus.status : 'open',
      overallHealth: kitchenStatus ? kitchenStatus.overallHealth : {}
    };
    
    // Emit to all connected clients
    io.emit('healthUpdate', healthData);
    console.log('Health update emitted:', healthData.server, healthData.kitchen);
    
  } catch (error) {
    console.error('Health cron error:', error);
    const io = app.get('io');
    io.emit('healthUpdate', { server: 'unhealthy', error: error.message });
  }
}, 30000); // 30 seconds

// Kitchen auto status DISABLED - Manual closes respected permanently
// Manual close during open hours stays closed until manual reopen
// (No auto-override)


// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(compression());
app.use(rateLimit.apiLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically at root /uploads path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', rateLimit.authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/revenue', require('./routes/revenue'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/order'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/coupons', require('./routes/coupon'));
app.use('/api/tables', require('./routes/table'));
app.use('/api/kitchen', require('./routes/kitchen'));
app.use('/api/health', require('./routes/health'));


// Error handling middleware
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (0.0.0.0)`);
});
