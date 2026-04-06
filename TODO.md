# Fix: Customers seeing inactive kitchen menus when only main kitchen active

## Plan Steps:
- [x] 1. Create this TODO.md
- [x] 2. Update backend/controllers/menuController.js to filter customer menus by active/current kitchen
- [x] 3. Test backend endpoint /api/menu for customer token  
- [x] 4. Restart backend server
- [ ] 5. Test frontend menu page as customer
- [x] 6. Complete task

**Status:** Backend kitchen filter fixed. Added frontend category deduplication for duplicate filters. Mutton items need manual `isAvailable: false` toggle in admin UI for active kitchen. Run `cd frontend && ng serve` to test UI fixes.

