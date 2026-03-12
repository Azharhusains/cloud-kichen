# Razorpay Integration TODO

## Plan Overview
Replace Stripe with Razorpay for online payments (INR/UPI/cards). Keep COD. Backend creates Razorpay order → Frontend opens checkout modal → Post-payment verify signature → Create DB Order.

## Steps (6/8 completed) ✅

### [x] 1. Install backend dependencies ✅
### [x] 2. Add Razorpay keys to backend/.env ✅ (user confirmed)
### [x] 3. Update backend/controllers/paymentController.js ✅
### [x] 4. Update backend/routes/payment.js ✅
### [x] 5. Update frontend/src/app/services/order.service.ts ✅
### [x] 6. Update frontend/src/app/components/checkout/checkout.component.ts & .html ✅ (Stripe removed, Razorpay flow)

### [ ] 7. Test integration
### [ ] 8. Cleanups
- Add Razorpay instance
- Rewrite createPaymentSession → createRazorpayOrder
- Add verifyPayment endpoint logic
- Remove Stripe code

### [ ] 4. Update backend/routes/payment.js
- Adjust routes: /create-session → /create-order (optional), add /verify

### [ ] 5. Update frontend/src/app/services/order.service.ts
- Add verifyPayment(orderId, paymentId, signature) POST /payment/verify

### [ ] 6. Update frontend/src/app/components/checkout/checkout.component.ts
- Remove Stripe
- Add Razorpay script load
- Update payment flow: open Razorpay modal, handler → verify

### [ ] 7. Test integration
- Backend: `npm run dev`
- Frontend: `ng serve`
- Test COD, Razorpay checkout+coupon, order creation

### [ ] 8. Cleanups (optional)
- Remove Stripe deps
- Update docs/README

**Next step after completion: attempt_completion**

