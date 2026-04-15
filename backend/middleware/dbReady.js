const { connectDB, dbReady, onReady, mongooseConnection } = require('../config/database');

/**
 * DB Readiness Middleware - Blocks requests until MongoDB is fully connected
 * Critical for bufferCommands: false setup
 */
const dbReadyMiddleware = async (req, res, next) => {
  // Fast path: already ready
  if (dbReady()) {
    try {
      // Double-check with ping (production safety)
      await mongooseConnection().db.admin().ping();
      return next();
    } catch (pingErr) {
      console.error('DB ping failed despite ready flag:', pingErr.message);
    }
  }

  console.log('⏳ DB not ready, attempting connection...');
  
  try {
    // Wait for connection or timeout
    await Promise.race([
      onReady(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB connection timeout')), 10000)
      )
    ]);
    
    // Final ping check
    await mongooseConnection().db.admin().ping();
    console.log('✅ DB now ready for request');
    next();
  } catch (error) {
    console.error('❌ DB still not ready:', error.message);
    res.status(503).json({
      message: 'Database not ready. Please try again in a moment.',
      retryAfter: 5
    });
  }
};

module.exports = dbReadyMiddleware;

