const express = require('express');
const { getOrders, getOrder, getOrderByOrderId, createOrder, updateOrderStatus } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getOrders);
router.get('/by-order-id/:orderId', protect, getOrderByOrderId);
router.get('/:id', protect, getOrder);
router.post('/', protect, createOrder);
router.put('/:id/status', protect, authorize('admin'), updateOrderStatus);

module.exports = router;
