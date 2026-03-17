const express = require('express');
const { getOrders, getOrder, createOrder, updateOrderStatus, getInvoice, cancelOrder } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);
router.post('/', protect, createOrder);
router.put('/:id/status', protect, authorize('admin'), updateOrderStatus);
router.get('/:id/invoice', protect, getInvoice);
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
