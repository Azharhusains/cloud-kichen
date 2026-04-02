/**
 * One-time migration script to create production indexes
 * Run: node backend/scripts/create_indexes.js
 * Safe: uses createIndex with unique:false, skips if exists
 */

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

const createIndexes = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Order indexes
    console.log('🔄 Creating Order indexes...');
    await Order.collection.createIndex({ user: 1, createdAt: -1 }, { name: 'user_createdAt_idx' });
    await Order.collection.createIndex({ orderStatus: 1, createdAt: -1 }, { name: 'orderStatus_createdAt_idx' });
    console.log('✅ Order indexes created');

    // MenuItem indexes
    console.log('🔄 Creating MenuItem indexes...');
    await MenuItem.collection.createIndex({ category: 1, name: 1 }, { name: 'category_name_idx' });
    await MenuItem.collection.createIndex({ isAvailable: 1 }, { name: 'isAvailable_idx' });
    console.log('✅ MenuItem indexes created');

    // User indexes
    console.log('🔄 Creating User indexes...');
    await User.collection.createIndex({ email: 1 }, { name: 'email_idx', unique: true });
    await User.collection.createIndex({ role: 1 }, { name: 'role_idx' });
    console.log('✅ User indexes created');

    console.log('🎉 All production indexes created successfully!');
    console.log('💡 Indexes will improve query performance for dashboards, customer history, etc.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Index creation failed:', error.message);
    process.exit(1);
  }
};

createIndexes();

