const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { connectDB, dbReady, mongooseConnection, onReady } = require('./config/database');

// Load env
dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect DB with retry (async, non-blocking)
connectDB();

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

// Socket events (moved before models for cleaner structure)
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

// ================= ✅ CRON JOBS (DB READY GUARDED) =================

// Auto unlock tables - only run when DB connected
const autoUnlockTables = async () => {
  if (!dbReady()) {
    console.log('⏳ DB not ready, skipping auto-unlock');
    return;
  }

  try {
    const now = new Date();
    const Table = require('./models/Table');
    const expiredLocks = await Table.find({
      status: 'locked',
      lockExpiresAt: { $lt: now }
    }).lean();

    for (const table of expiredLocks) {
      await Table.findByIdAndUpdate(table._id, {
        status: 'available',
        lockedBy: null,
        lockExpiresAt: null
      });

      io?.emit('table_unlocked', {
        tableId: table._id,
        tableNumber: table.tableNumber
      });

      io?.to('adminRoom').emit('tableStatusChanged', table);
    }
    
    if (expiredLocks.length > 0) {
      console.log(`🔓 Auto-unlocked ${expiredLocks.length} expired table locks`);
    }
  } catch (error) {
    console.error('Auto-unlock error:', error);
  }
};

// Started after DB ready

// Health updates - DB ready guarded
const sendHealthUpdate = async () => {
  if (!dbReady()) {
    io?.emit('healthUpdate', { 
      server: 'starting', 
      database: 'connecting',
      timestamp: new Date().toISOString() 
    });
    return;
  }

  try {
    const KitchenStatus = require('./models/KitchenStatus');
    const kitchenStatus = await KitchenStatus.findOne().sort({ updatedAt: -1 });

    io?.emit('healthUpdate', {
      server: 'healthy',
      database: 'healthy',
      timestamp: new Date().toISOString(),
      kitchen: kitchenStatus?.status || 'open',
      readyState: mongooseConnection().readyState
    });
  } catch (error) {
    io?.emit('healthUpdate', { 
      server: 'healthy', 
      database: 'unhealthy', 
      error: error.message 
    });
  }
};

// Started after DB ready

// ================= ✅ CRON JOBS - DB READY =================

// Start cron jobs when DB is ready
onReady().then(() => {
  console.log('🚀 Starting DB-dependent cron jobs');
  
  autoUnlockTables();
  setInterval(autoUnlockTables, 10000);
  
  sendHealthUpdate();
  setInterval(sendHealthUpdate, 30000);
}).catch(err => {
  console.error('❌ Failed to start cron jobs:', err);
});

// ================= ✅ MIDDLEWARE =================

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================= ✅ ROOT HEALTH (Render PaaS) =================
app.head('/', (req, res) => {
  res.set('Content-Type', 'text/plain').status(200).send('OK');
});

app.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    database: dbReady() ? 'ready' : 'connecting',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  };
  
  if (dbReady()) {
    try {
      await mongooseConnection().db.admin().ping();
      health.database = 'healthy';
    } catch {
      health.database = 'unhealthy';
    }
  }
  
  res.json(health);
});



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
