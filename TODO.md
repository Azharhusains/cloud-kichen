# Fix Order Tracking Invoice Button Visibility

## Plan Status: ✅ Approved by User (interpreted 'ues' as 'yes')

**Issue**: Invoice button not visible in order-tracking despite backend APIs working.

**Root Cause**: `canShowInvoice()` checked main `order.orderStatus` instead of `effectiveOrderStatus` (sub-order aggregated).

## TODO Steps:

### 1. ✅ Create TODO.md & Track Progress **COMPLETE**

### 2. ✅ Edit order-tracking.component.ts **COMPLETE**
   - Updated `canShowInvoice()`: Now uses `this.effectiveOrderStatus`
   - Button now visible when timeline shows 'delivered'/'completed'

### 3. [PENDING] Test Changes
   - Run: `cd frontend && ng serve`
   - Navigate to order-tracking for completed order
   - Verify: Invoice button appears → Click → Dialog opens/PDF loads

### 4. [PENDING] Final Verification
   - Test with real completed order (sub-orders advanced)
   - Confirm PDF download via backend API

### 5. [PENDING] Completion
   - Update TODO.md final status
   - Clean up (no console.logs added)

**Progress**: 2/5 complete

**Next**: Test in browser → Run commands below → Report if button visible."


