const express = require('express');
const { getOrders, getOrder, createOrder, updateOrderStatus, getInvoice, getOrderInvoicePDF, cancelOrder, getMasterOrderByTable, getMasterOrderAggregated, addMoreItems, cancelMasterOrder } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);
router.post('/', protect, createOrder);
router.put('/:id/status', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateOrderStatus);
router.get('/:id/invoice', protect, getInvoice);
router.get('/:orderNumber/invoice', protect, getOrderInvoicePDF);
router.put('/:id/cancel', protect, cancelOrder);

// NEW: Dine-In Add More Items endpoints
router.get('/master-orders/dinein/:tableNumber', protect, getMasterOrderByTable);
router.get('/master-orders/table/:tableNumber/active', protect, async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const masterOrder = await require('../models/MasterOrder').findOne({
      tableId: tableNumber,
      status: 'ACTIVE'
    });
    res.json(!!masterOrder);
  } catch (error) {
    res.json(false);
  }
});
router.get('/master-orders/:masterOrderId', protect, getMasterOrderAggregated);
router.post('/master-orders/dinein/:tableNumber/add-more', protect, addMoreItems);
router.put('/master-orders/:id/cancel', protect, cancelMasterOrder);

module.exports = router;

