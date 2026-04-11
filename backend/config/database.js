const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI environment variable not set');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    maxRetries: 5,
    retryDelay: 5000,
    bufferCommands: false,
  });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
