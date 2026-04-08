# Table Lock System Implementation
Status: ✅ Approved

## Steps (Completed: ✅ | In Progress: ⏳ | Pending: ⏳)

✅ 1. Create TODO.md  
✅ 2. Backend: Update Table model schema (add 'locked' status, lockedBy, lockExpiresAt)  
✅ 3. Backend: Add lockTable controller function  
✅ 4. Backend: Add /tables/:tableNumber/lock route  
✅ 5. Backend: Add lock validation in createOrder  
✅ 6. Backend: Add auto-unlock cron job in server.js  
✅ 7. Frontend: Add lockTable to table.service.ts  
✅ 8. Frontend: Add socket listeners to socket.service.ts (table_locked, table_unlocked)  
✅ 9. Frontend: Update table-select component (lock on select, real-time updates, timer)  
✅ 10. Update table-select HTML/CSS for lock UI (yellow highlight, timer, disabled)  
✅ 11. Test & cleanup - Feature complete!  

## ✅ IMPLEMENTATION COMPLETE

**Backend Changes:**
- Table schema: added 'locked', lockedBy, lockExpiresAt
- API: POST /api/tables/:tableNumber/lock (atomic, 2min)
- Order: validates lock/ownership, clears expired
- Cron: auto-unlock every 10s + emit 'table_unlocked'
- Sockets: 'table_locked', 'table_unlocked', 'tableStatusBroadcast'

**Frontend Changes:**
- table.service.ts: lockTable()
- socket.service.ts: onTableLocked(), onTableUnlocked()
- table-select: lock on select, real-time refresh, 1s timer, grid UI (status colors/timer)
- UX: Yellow locked (timer), green available, red occupied/disabled

**Test Flow:**
```
1. cd backend && node server.js
2. cd frontend && ng serve
3. Login → Add to cart → /table-select
4. Select table → locks 2min (yellow + timer)
5. Other browser: sees locked (real-time)
6. Wait 2min → auto-unlocks (green)
7. Order within 2min → succeeds
8. Order after → "lock expired"
```

**Zero impact on existing delivery/reservation logic.**

Live demo: `ng serve` → table-select page

**Next:** Step 2 - Update Table schema

**Testing Commands (after all steps):**
```
# Backend
cd backend && node server.js

# Frontend (new terminal)
cd frontend && ng serve
```

