const express = require('express');
const { getOrders, getOrder, createOrder, updateOrderStatus, getInvoice, getOrderInvoicePDF, cancelOrder } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);
router.post('/', protect, require('../middleware/validation').orderCreate, createOrder);
router.put('/:id/status', protect, authorize('ADMIN', 'SUPER_ADMIN'), require('../middleware/validation').orderUpdateStatus, updateOrderStatus);
router.get('/:id/invoice', protect, getInvoice);
router.get('/:orderNumber/invoice', protect, getOrderInvoicePDF);
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;

