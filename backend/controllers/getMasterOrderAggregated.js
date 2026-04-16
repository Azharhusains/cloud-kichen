// 4e: Get aggregated MasterOrder for user UI
const { getAggregatedOrder } = require('../utils/orderAggregation');

const getMasterOrderAggregated = async (req, res) => {
  try {
    const { masterOrderId } = req.params;

    if (!masterOrderId) {
      return res.status(400).json({ message: 'masterOrderId required' });
    }

    const aggregated = await getAggregatedOrder(masterOrderId);

    res.json(aggregated);
  } catch (error) {
    console.error('getMasterOrderAggregated error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = getMasterOrderAggregated;

