const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
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

// Production middleware stack (optimized order)
app.use(helmet());
// Rate limiting (global)
app.use(require('./middleware/rateLimit').limiter);
// CORS
app.use(cors());
// Logging
app.use(morgan('combined'));
// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Input sanitization (XSS prevention)
app.use(require('./middleware/sanitize'));

// Public health check endpoints for frontend network service (root and /api)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// Serve uploaded files statically at root /uploads path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/revenue', require('./routes/revenue'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/order'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/tables', require('./routes/table'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/kitchens', require('./routes/kitchens'));
app.use('/api/admin', require('./routes/admin'));

// Centralized error handler (replaces basic one)
app.use(require('./middleware/errorHandler').handleError);

// 404 handler (after error handler)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
