const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

const getRevenue = async (req, res) => {
  try {
    const timeFilter = req.query.timeRange || 'today';
    let match = {};
    const now = new Date();
    
    // Add kitchen filter
    if (req.kitchen) {
      match.kitchenId = req.kitchen._id;
    }

    switch (timeFilter) {
      case 'week':
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        match.createdAt = { $gte: weekStart };
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        match.createdAt = { $gte: monthStart };
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        match.createdAt = { $gte: yearStart };
        break;
      default:
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        match.createdAt = { $gte: dayStart };
    }

    const baseMatch = { 
      $and: [
        match,
        { 
          $or: [
            { paymentStatus: 'succeeded' },
            { paymentMethod: 'cash', orderStatus: { $in: ['delivered', 'completed'] } }
          ]
        },
        { orderStatus: { $nin: ['cancelled'] } }
      ]
    };

    // 1. Existing stats
    const revenueStats = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          totalProfit: { $sum: '$profit' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalProfit: { $round: ['$totalProfit', 2] },
          totalOrders: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          profitMargin: { 
            $round: [{ $multiply: [{ $divide: ['$totalProfit', '$totalRevenue'] }, 100] }, 2] 
          }
        }
      }
    ]);

    // 2. Payment Stats (cash vs online)
    const paymentStats = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      },
      {
        $group: {
          _id: null,
          cash: {
            $sum: { $cond: [{ $eq: ['$_id', 'cash'] }, '$count', 0] }
          },
          cashAmount: {
            $sum: { $cond: [{ $eq: ['$_id', 'cash'] }, '$amount', 0] }
          },
          online: {
            $sum: { $cond: [{ $eq: ['$_id', 'online'] }, '$count', 0] }
          },
          onlineAmount: {
            $sum: { $cond: [{ $eq: ['$_id', 'online'] }, '$amount', 0] }
          },
          total: { $sum: '$amount' },
          totalCount: { $sum: '$count' }
        }
      },
      {
        $project: {
          _id: 0,
          cash: { $round: ['$cash', 0] },
          cashAmount: { $round: ['$cashAmount', 2] },
          online: { $round: ['$online', 0] },
          onlineAmount: { $round: ['$onlineAmount', 2] },
          cashPercentage: { 
            $round: [{ $multiply: [{ $divide: ['$cashAmount', '$total'] }, 100] }, 1] 
          },
          onlinePercentage: { 
            $round: [{ $multiply: [{ $divide: ['$onlineAmount', '$total'] }, 100] }, 1] 
          }
        }
      }
    ]);

    // 3. Revenue Trend (last 30 days daily)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const revenueTrend = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: thirtyDaysAgo },
        ...baseMatch.$and[1] // Reuse payment/order status conditions
      }},
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          date: { $first: '$createdAt' },
          revenue: { $sum: '$totalAmount' },
          profit: { $sum: '$profit' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { 'date': 1 } },
      {
        $project: {
          _id: 0,
          date: { 
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          revenue: { $round: ['$revenue', 2] },
          profit: { $round: ['$profit', 2] },
          orders: 1
        }
      }
    ]);

    // 4. Top Products Revenue
    const topProducts = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuItem'
        }
      },
      { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$menuItem._id',
          name: { $first: '$menuItem.name' },
          revenue: { 
            $sum: { $multiply: ['$items.price', '$items.quantity'] } 
          },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          name: 1,
          revenue: { $round: ['$revenue', 2] },
          quantity: 1,
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$revenue', revenueStats[0]?.totalRevenue || 1] }, 100] }, 1]
          }
        }
      }
    ]);

    // Recent orders with more details
    const recentOrders = await Order.find(baseMatch)
      .select('orderNumber totalAmount paymentMethod paymentStatus orderStatus createdAt orderType')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      stats: revenueStats[0] || { totalRevenue: 0, totalProfit: 0, totalOrders: 0, avgOrderValue: 0, profitMargin: 0 },
      paymentStats: paymentStats[0] || { cash: 0, online: 0, cashAmount: 0, onlineAmount: 0, cashPercentage: 0, onlinePercentage: 0 },
      revenueTrend,
      topProducts,
      recentOrders,
      period: timeFilter
    });

  } catch (error) {
    console.error('Revenue error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRevenue };

