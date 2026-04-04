const express = require('express');
const { getOrders, getOrder, createOrder, updateOrderStatus, getInvoice, getOrderInvoicePDF, cancelOrder } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { requireKitchenContext } = require('../middleware/kitchenAuth');

const router = express.Router();

router.get('/', protect, requireKitchenContext, getOrders);
router.get('/:id', protect, requireKitchenContext, getOrder);
router.post('/', protect, require('../middleware/validation').orderCreate, createOrder);
router.put('/:id/status', protect, requireKitchenContext, authorize('ADMIN', 'SUPER_ADMIN'), require('../middleware/validation').orderUpdateStatus, updateOrderStatus);
router.get('/:id/invoice', protect, requireKitchenContext, getInvoice);
router.get('/:orderNumber/invoice', protect, requireKitchenContext, getOrderInvoicePDF);
router.put('/:id/cancel', protect, requireKitchenContext, cancelOrder);

module.exports = router;

