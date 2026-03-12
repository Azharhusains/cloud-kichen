# TODO - Table Ordering System (Dine-in + Delivery)

## Backend Changes - COMPLETED ✓
- [x] 1. Create Table model (`backend/models/Table.js`)
- [x] 2. Update Order model - add orderType and tableNumber fields (`backend/models/Order.js`)
- [x] 3. Create Table controller (`backend/controllers/tableController.js`)
- [x] 4. Create Table routes (`backend/routes/table.js`)
- [x] 5. Register table routes in server.js
- [x] 6. Update orderController - handle dine-in vs delivery orders

## Frontend Changes - COMPLETED ✓
- [x] 7. Create TableService (`frontend/src/app/services/table.service.ts`)
- [x] 8. Update CartService - add table info methods (`frontend/src/app/services/cart.service.ts`)
- [x] 9. Create TableSelect component (`frontend/src/app/components/table-select/`)
- [x] 10. Update checkout component - handle dine-in orders (`frontend/src/app/components/checkout/`)
- [x] 11. Update routes - add table-select route (`frontend/src/app/app.routes.ts`)
- [x] 12. Update cart component - redirect to table-select (`frontend/src/app/components/cart/cart.component.ts`)

## Admin Panel - COMPLETED ✓
- [x] 13. Create Admin Table Management page (`frontend/src/app/components/admin/table-management/`)
- [x] 14. Update Admin Order Management - show order type and table number (`order-management.component.html`)
- [x] 15. Update navigation - add Tables link in admin sidebar

## All Tasks Completed! ✓

## How the System Works

### User Flow:
1. User browses menu and adds items to cart
2. User goes to cart and clicks "Checkout"
3. User is redirected to Table Select page
4. User chooses either "Dine-in" or "Delivery"
   - For Dine-in: Enter table number → Verify → Proceed to checkout
   - For Delivery: Directly go to checkout
5. Checkout shows appropriate form:
   - Dine-in: Shows table info, no address needed, no delivery charge
   - Delivery: Shows address form with delivery charge
6. Order is created with orderType and tableNumber (if dine-in)

### Admin View:
- All orders shown in admin dashboard with order type badge
- Orders can be filtered by status
- Each order shows whether it's dine-in or delivery with colored badge
- Dine-in orders show table number
- Delivery orders show delivery address
- Admin can manage tables at /admin/tables

