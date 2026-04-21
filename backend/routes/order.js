const express = require('express');
const { 
  getOrders, 
  getOrder, 
  createOrder, 
  updateOrderStatus, 
  getInvoice, 
  getOrderInvoicePDF, 
  cancelOrder,
  addMoreToOrder,
  getMainOrderWithSubOrders,
  cancelSubOrder,
  completeMainOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);
router.post('/', protect, createOrder);
router.put('/:id/status', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateOrderStatus);
router.get('/:id/invoice', protect, getInvoice);
router.get('/:orderNumber/invoice', protect, getOrderInvoicePDF);
router.put('/:id/cancel', protect, cancelOrder);

// New sub order / add more routes
router.post('/:mainOrderId/add-more', protect, addMoreToOrder);
router.get('/:mainOrderId/details', protect, getMainOrderWithSubOrders);
router.patch('/sub-orders/:id/cancel', protect, cancelSubOrder);
router.patch('/:id/complete', protect, authorize('ADMIN', 'SUPER_ADMIN'), completeMainOrder);

module.exports = router;

