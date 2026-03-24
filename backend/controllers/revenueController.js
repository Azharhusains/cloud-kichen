const Order = require('../models/Order');
const User = require('../models/User');
const AILogger = require('../models/AILogger');
const mongoose = require('mongoose');

// Get revenue dashboard - SUPER_ADMIN only
const getRevenueDashboard = async (req, res) => {
  try {
    // Log revenue access (audit)
    await AILogger.create({
      user: req.user._id,
      voiceInput: 'REVENUE_ACCESS_AUDIT',
      intents: ['revenue_access'],
      commands: [{
        action: 'revenue_access',
        success: true,
        itemName: 'Dashboard View'
      }],
      response: { message: 'Revenue dashboard accessed', success: true },
      browserInfo: req.get('User-Agent'),
      status: 'completed'
    });

    const matchQuery = {};
    const dateFilters = {};

    // Date range filter
    if (req.query.startDate) {
      matchQuery.createdAt = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
      if (!matchQuery.createdAt) matchQuery.createdAt = {};
      matchQuery.createdAt.$lte = new Date(req.query.endDate);
    }

    // Overall totals
    const totalRevenue = await Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    const avgOrderValue = totalRevenue[0] ? totalRevenue[0].total / totalRevenue[0].count : 0;

    // Daily breakdown (last 30 days)
    const dailyRevenue = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          avg: { $avg: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Monthly breakdown
    const monthlyRevenue = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top customers (last 30 days)
    const topCustomers = await Order.aggregate([
      { $match: { ...matchQuery, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
        pipeline: [{ $project: { name: 1, email: 1 } }]
      } },
      { $unwind: '$customer' },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders: totalRevenue[0]?.count || 0,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100
      },
      daily: dailyRevenue,
      monthly: monthlyRevenue,
      topCustomers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRevenueDashboard };
