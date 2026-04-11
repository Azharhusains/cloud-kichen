const express = require('express');
const router = express.Router();
const KitchenStatus = require('../models/KitchenStatus');
const mongoose = require('mongoose');

// Health check endpoint - called periodically by frontend
router.get('/', async (req, res) => {
  try {
    const start = Date.now();
    
    // 1. Server basic health
    const serverHealth = {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      responseTime: 0
    };

    // 2. DB connection check
    try {
      await mongoose.connection.db.admin().ping();
      serverHealth.database = 'healthy';
    } catch (dbError) {
      serverHealth.database = 'unhealthy';
      serverHealth.dbError = dbError.message;
    }

    // 3. Kitchen status
    const kitchen = await KitchenStatus.findOne().sort({ updatedAt: -1 }).populate('manualBy', 'name');
    serverHealth.kitchen = kitchen || { status: 'open', isManual: false };

    // 4. Calculate response time
    serverHealth.responseTime = Date.now() - start;

    // 5. Recent orders count (performance indicator) - use mongoose connection directly
    let recentOrders = 0;
    try {
      recentOrders = await mongoose.connection.db.collection('orders').countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } 
      });
    } catch (countError) {
      serverHealth.orderCountError = countError.message;
    }
    serverHealth.recentOrders24h = recentOrders;


    res.json(serverHealth);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

