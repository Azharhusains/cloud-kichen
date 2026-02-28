# TODO - Order Tracking Price Breakdown

## Task
Add explanation about extra charges (amount vs total amount) on the order tracking page.

## Plan
- [x] 1. Update Order model - Add fields: subtotal, deliveryCharge, taxAmount, taxRate
- [x] 2. Update Order controller - Store the charge breakdown when creating order
- [x] 3. Update Order tracking component TS - Add helper methods to display breakdown
- [x] 4. Update Order tracking component HTML - Add price breakdown section with explanation
- [x] 5. Update SCSS - Add styles for price breakdown elements

## Changes Made

### 1. backend/models/Order.js
Added new fields to store charge breakdown:
- `subtotal`: Sum of item prices
- `deliveryCharge`: Delivery fee (₹50)
- `taxRate`: Tax rate (18%)
- `taxAmount`: Calculated tax amount

### 2. backend/controllers/orderController.js
Updated `createOrder` function to:
- Calculate subtotal from items
- Calculate tax amount (18% of subtotal)
- Store all breakdown values in the order

### 3. frontend/src/app/components/order-tracking/order-tracking.component.ts
Added helper methods:
- `getSubtotal()`: Returns subtotal
- `getDeliveryCharge()`: Returns delivery charge
- `getTaxAmount()`: Returns tax amount
- `getTaxRate()`: Returns tax rate as percentage
- `getTotalAmount()`: Returns total amount
- `hasPriceBreakdown()`: Checks if breakdown data exists

### 4. frontend/src/app/components/order-tracking/order-tracking.component.html
Added price breakdown section showing:
- Subtotal
- Tax (18%)
- Delivery Charge
- Total Amount
- Explanation box explaining extra charges

### 5. frontend/src/app/components/order-tracking/order-tracking.component.scss
Added styles for:
- `.price-breakdown`: Container for price breakdown
- `.price-row`: Individual price line items
- `.grand-total`: Total amount styling
- `.price-explanation`: Info box with explanation
