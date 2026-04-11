# Fix Render Deployment Crash - MongoDB Options & Indexes

## Step 1: Fix MongoDB connection options in backend/config/database.js [✅ COMPLETED]
Remove invalid `maxRetries`, `retryDelay` (Redis options)

## Step 2: Identify models with duplicate indexes [✅ COMPLETED]
Found explicit indexes in Category.js, Inventory.js, Coupon.js, Table.js causing conflicts with timestamps: true

## Step 3: Fix duplicate indexes in models [✅ COMPLETED]
Removed explicit createdBy/updatedBy indexes from Category.js, Inventory.js, Coupon.js, Table.js

## Step 4: Local test [PENDING]
npm start - verify no warnings/crash

## Step 5: Deploy & verify Render [PENDING]
