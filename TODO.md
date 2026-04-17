# Fix Caching Issue - Hard Reload Required
Status: 🔄 In Progress

## Phase 1: Immediate Fix (Critical)
- [x] Create this TODO.md
- [x] 1.1 Disable SW registration (index.html)
- [x] 1.2 Add cache-busting helper service
- [x] 1.3 Update order.service.ts (cache-busting)
- [x] 1.4 Update menu.service.ts (remove cache + cache-busting)  
- [x] 1.5 Update table.service.ts (cache-busting)
- [x] 1.6 Update other services (cart, category, kitchen - no HTTP cache issues, all fixed)
- [ ] 1.7 Test: Normal refresh shows fresh data
- [ ] 1.8 Clear browser SW cache

## Phase 2: SW Proper Config
- [ ] 2.1 Update sw.js (network-only for APIs)
- [ ] 2.2 Re-enable SW registration
- [ ] 2.3 Test PWA + fresh data

## Phase 3: Backend Headers + Polish
- [ ] 3.1 Add Cache-Control headers (backend)
- [ ] 3.2 Socket refresh triggers
- [ ] 3.3 Complete ✅

**Next:** Test after each service update. Run `ng serve` and check normal refresh.

