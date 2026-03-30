# TODO: Implement Full/Half Toggle Logic (No Increment on Active Button)

## Steps:

- [x] 1. Add helper method `getQtyForPortion` to menu.component.ts
- [x] 2. Update `selectPortion` in menu.component.ts: gate addToCart on qty===0
- [x] 3. Add helper methods `getHalfQuantity()` and `getFullQuantity()` to menu-item-dialog.component.ts
- [x] 4. Update `selectPortionDialog` in menu-item-dialog.component.ts: gate addToCart on qty===0
- [x] 5. Fixed cartItemCount display issue by computing locally from cart array in subscription and loadCart
- [x] 6. attempt_completion
