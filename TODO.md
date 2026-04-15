# Table Unlock on Back Navigation Fix

## Steps:
- [x] Step 1: Update table-select.component.ts - modify goBack() to call clearTable() before navigate
- [x] Step 2: Update table-select.component.ts - add clearTable() call in ngOnDestroy()
- [ ] Step 3: Test the fix (manual verification)
- [ ] Step 4: Mark complete and cleanup TODO.md

**Status:** Code updates complete. Test by:
1. cd frontend && ng serve (if not running)
2. Backend: cd backend && node server.js (if not running)
3. Add cart items, go to table-select, lock table, click back -> check table status unlocked (admin dashboard or API).


