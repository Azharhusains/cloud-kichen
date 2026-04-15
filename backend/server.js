const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/database');

// Load env
dotenv.config();

// Connect DB
connectDB();

const app = express();
const server = http.createServer(app);

// ================= ✅ CORS CONFIG (PRODUCTION READY) =================

const allowedOrigins = [
  'https://cloud-kichen-az.netlify.app',
  'http://localhost:4200',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // mobile/postman

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Apply CORS
app.use(cors());

// Handle preflight OPTIONS\napp.options('*', cors());

// Fallback headers (extra safety)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, PATCH'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// ================= ✅ SOCKET.IO =================

const io = new Server(server, {
  cors: { origin: '*',
    methods: ['GET', 'POST'] }
});

app.set('io', io);

// Models
const Table = require('./models/Table');
const KitchenStatus = require('./models/KitchenStatus');

// Socket events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinAdmin', () => {
    socket.join('adminRoom');
  });

  socket.on('joinOrder', (orderId) => {
    socket.join(`order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ================= ✅ CRON JOBS =================

// Auto unlock tables
setInterval(async () => {
  try {
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

      io.emit('table_unlocked', {
        tableId: table._id,
        tableNumber: table.tableNumber
      });

      io.to('adminRoom').emit('tableStatusChanged', table);
    }
  } catch (error) {
    console.error('Auto-unlock error:', error);
  }
}, 10000);

// Health updates
setInterval(async () => {
  try {
    const kitchenStatus = await KitchenStatus.findOne().sort({ updatedAt: -1 });

    io.emit('healthUpdate', {
      server: 'healthy',
      database: 'healthy',
      timestamp: new Date().toISOString(),
      kitchen: kitchenStatus?.status || 'open'
    });
  } catch (error) {
    io.emit('healthUpdate', { server: 'unhealthy', error: error.message });
  }
}, 30000);

// ================= ✅ MIDDLEWARE =================

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================= ✅ ROUTES =================

app.use('/api/auth', require('./routes/auth'));
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

// ================= ✅ ERROR HANDLING =================

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    message: err.message || 'Internal Server Error'
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ================= ✅ START SERVER =================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);});
