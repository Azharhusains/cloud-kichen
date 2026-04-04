const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

class RecommendationService {
  // User-based: most ordered categories + items (last 30 days, min 2 orders)
  async getUserRecommendations(userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [categories, items] = await Promise.all([
      // Top categories
      Order.aggregate([
        { $match: { user: userId, createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $toString: '$items.menuItem.category' },
            totalQty: { $sum: '$items.quantity' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalQty: -1 } },
        { $limit: 5 },
        { $lookup: {
          from: 'menuitems',
          let: { cat: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$category', '$$cat'] }, isAvailable: true } }, { $limit: 1, $project: { name: 1, image: 1 } }],
          as: 'sampleItem'
        } },
        { $project: { category: '$_id', totalQty: 1, sampleItem: { $arrayElemAt: ['$sampleItem', 0] } } }
      ]),
      
      // Top individual items
      Order.aggregate([
        { $match: { user: userId, createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.menuItem',
            totalQty: { $sum: '$items.quantity' }
          }
        },
        { $match: { totalQty: { $gte: 1 } } },
        { $sort: { totalQty: -1 } },
        { $limit: 5 },
        { $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'item',
          pipeline: [
            { $match: { isAvailable: true } },
            {
              $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryObj',
                pipeline: [{ $project: { name: 1 } }]
              }
            },
            { $addFields: { category: { $arrayElemAt: ['$categoryObj.name', 0] } } },
            { $project: { name: 1, category: 1, fullPrice: 1, halfPrice: 1, image: 1, supportsHalf: 1, description: 1 } }
          ]
        } },
        { $unwind: { path: '$item', preserveNullAndEmptyArrays: false } },
        { $project: { item: 1, totalQty: 1 } }
      ])
    ]);

    return { categories: categories.slice(0,5), items };
  }

  // Global popular: top 10 available items by total revenue (price * qty)
  async getPopularItems() {
    const pipeline = [
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          totalQty: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 15 },
      { $lookup: {
        from: 'menuitems',
        localField: '_id',
        foreignField: '_id',
        as: 'item',
        pipeline: [
          { $match: { isAvailable: true } },
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'categoryObj',
              pipeline: [{ $project: { name: 1 } }]
            }
          },
          { $addFields: { category: { $arrayElemAt: ['$categoryObj.name', 0] } } },
          { $project: { name:1, category:1, fullPrice:1, halfPrice:1, image:1, supportsHalf:1, description:1, isAvailable:1 } }
        ]
      } },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      { $match: { 'item.isAvailable': { $ne: false } } },
      { $project: { item: 1, totalRevenue: 1, totalQty: 1, orderCount: 1 } }
    ];

    const popular = await Order.aggregate(pipeline);
    return popular.slice(0,10);
  }

  // Frequent combos: top 5 item pairs from multi-item orders
  async getFrequentCombos() {
    const combos = await Order.aggregate([
      { $match: { 'items.1': { $exists: true } } }, // Multi-item only
      { $addFields: {
        itemIds: { $map: { input: '$items', as: 'i', in: '$$i.menuItem' } }
      }},
      { $addFields: {
        pairs: {
          $reduce: {
            input: { $range: [0, { $subtract: [{ $size: '$itemIds' }, 1] }] },
            initialValue: [],
            in: {
              $concatArrays: [
                '$$value',
                [{ item1: { $arrayElemAt: ['$itemIds', '$$this'] }, item2: { $arrayElemAt: ['$itemIds', { $add: ['$$this', 1] }] } }]
              ]
            }
          }
        }
      }},
      { $unwind: '$pairs' },
      {
        $group: {
          _id: {
            item1: { $min: ['$pairs.item1', '$pairs.item2'] },
            item2: { $max: ['$pairs.item1', '$pairs.item2'] }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id.item1',
          foreignField: '_id',
          as: 'item1'
        }
      },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id.item2',
          foreignField: '_id',
          as: 'item2'
        }
      },
      { $unwind: { path: '$item1', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$item2', preserveNullAndEmptyArrays: true } },
      { $match: { 'item1.isAvailable': true, 'item2.isAvailable': true } },
      { $project: {
        _id: 0,
        items: [{ $ifNull: ['$item1', {}] }, { $ifNull: ['$item2', {}] }],
        count: 1
      }}
    ]);

    return combos.slice(0,5);
  }

async getRecommendations(userId) {
    console.log('[REC-SVC] getRecommendations called for userId:', userId);
    if (userId === 'global-popular-trick') {
const popular = await this.getPopularItems();
    console.log('[REC-SVC] Global popular items count:', popular.length);
      return { 
        userBased: { categories: [], items: [] }, 
        popular, 
        combos: [],
        timestamp: new Date()
      };
    }

    const [userRecs, popular, combos] = await Promise.all([
      this.getUserRecommendations(userId),
      this.getPopularItems(),
      this.getFrequentCombos()
    ]);
    return { 
      userBased: userRecs, 
      popular, 
      combos,
      timestamp: new Date()
    };
  }
}

module.exports = new RecommendationService();

