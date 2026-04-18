const Coupon = require('../models/Coupon');

const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).populate('createdBy updatedBy', 'name').sort({ validUntil: 1 });
    
    // Real-time: Emit updated coupons list
    const io = req.app.get('io');
    io.to('adminRoom').emit('couponsListUpdated', coupons);
    io.emit('couponsListUpdated', coupons);
    
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCoupon = async (req, res) => {
  try {
    const couponData = {
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };
    const coupon = new Coupon(couponData);
    const createdCoupon = await coupon.save();
    
    // Real-time: Emit new coupon + list refresh
    const io = req.app.get('io');
    const updatedCoupons = await Coupon.find({}).populate('createdBy updatedBy', 'name').sort({ validUntil: 1 });
    io.to('adminRoom').emit('couponCreated', createdCoupon);
    io.to('adminRoom').emit('couponsListUpdated', updatedCoupons);
    io.emit('couponCreated', createdCoupon);
    io.emit('couponsListUpdated', updatedCoupons);
    
    res.status(201).json(createdCoupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const deletedCoupon = await Coupon.findById(req.params.id);
    await Coupon.findByIdAndDelete(req.params.id);
    
    // Real-time: Emit deletion + list refresh
    const io = req.app.get('io');
    const updatedCoupons = await Coupon.find({}).populate('createdBy updatedBy', 'name').sort({ validUntil: 1 });
    io.to('adminRoom').emit('couponDeleted', { id: req.params.id, coupon: deletedCoupon });
    io.to('adminRoom').emit('couponsListUpdated', updatedCoupons);
    io.emit('couponDeleted', { id: req.params.id, coupon: deletedCoupon });
    io.emit('couponsListUpdated', updatedCoupons);
    
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCoupons, createCoupon, deleteCoupon };

