# Fix Order Creation 500 Error (paymentMethod: cod enum validation)

## Plan Summary
- Add 'cod' to backend/models/Order.js paymentMethod enum
- Add COD→cash mapping + logic update in backend/controllers/orderController.js createOrder
- Test POST /api/orders with COD payload

Status: [ ] Not started | [x] In progress | [ ] Completed

## Step-by-Step Tasks
### 1. [✅] Edit backend/models/Order.js - Add 'cod' to enum
### 2. [✅] Edit backend/controllers/orderController.js - Add mapping and update validation/messages
### 3. [ ] Test endpoint locally (POST /api/orders with provided payload)
### 4. [ ] Verify order creation, stock deduction, table lock, invoice/email
### 5. [ ] Mark complete & cleanup TODO.md
### 6. [ ] (Optional) Frontend consistency check

Next step: Edit model → controller → test

**Current Step: 1/6 - Edit Order.js model**
