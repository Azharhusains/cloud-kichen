const mongoose = require('mongoose');

let dbReady = false;
let retries = 0;
let resolveReady;
const readyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});
const MAX_RETRIES = 10;

// Serverless-safe options (no buffering)
const mongooseOptions = {
  bufferCommands: false,
  bufferTimeoutMS: 0,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // IPv4 only
  autoIndex: false // Disable auto-indexing in prod
};

const connectDB = async () => {
  try {
    console.log('🔄 Attempting MongoDB connection... (attempt ' + (retries + 1) + ')');
    
    const conn = await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    
    // Connection events
mongoose.connection.once('connected', () => {
      dbReady = true;
      resolveReady?.();
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      dbReady = false;
      console.log('🔌 MongoDB disconnected');
    });

    retries = 0; // Reset retries on success
  } catch (error) {
    retries++;
    console.error(`❌ DB Connection failed (attempt ${retries}):`, error.message);
    
    if (retries >= MAX_RETRIES) {
      console.error('💥 Max retries exceeded. Exiting.');
      process.exit(1);
    }
    
    // Retry after delay
    setTimeout(connectDB, 5000 * retries);
  }
};

// Export for use in server.js
module.exports = { connectDB, dbReady: () => dbReady, mongooseConnection: () => mongoose.connection, onReady: () => readyPromise };
