# Cloud Kitchen Production Readiness TODO

Status: ✅ Plan Approved | 📝 In Progress | ✅ Completed | ⏳ Blocked

## Breakdown of Approved Plan (Step-by-step)

### Phase 1: Dependencies & Setup
- ✅ **1.1** Update backend/package.json → add express-rate-limit@^7.4.0, joi@^17.13.3, sharp@^0.33.5
- ✅ **1.2** Run `cd backend && npm install`
- ✅ **1.3** Verify no breaking deps

**Next Step: Phase 2.1 - Create backend/middleware/rateLimit.js**

### Phase 2: Create New Middleware Files
- ✅ **2.1** `backend/middleware/rateLimit.js` (global + auth limiter)
- ✅ **2.2** `backend/middleware/validation.js` (Joi schemas + validateRequest)
- ✅ **2.3** `backend/middleware/errorHandler.js` (centralized JSON errors)
- ✅ **2.4** `backend/middleware/imageCompress.js` (sharp middleware for multer)
- ✅ **2.5** `backend/middleware/sanitize.js` (input sanitization)

**Next Step: Phase 3.1 - Update backend/models/Order.js indexes**

### Phase 3: Update Models (Add Indexes)
- ✅ **3.1** backend/models/Order.js → indexes: {user+createdAt}, {orderStatus+createdAt}
- ✅ **3.2** backend/models/MenuItem.js → {category+name}, {isAvailable}
- ✅ **3.3** backend/models/User.js → {email}, {role}
- ✅ **3.4** Created index migration: backend/scripts/create_indexes.js
**Run once: `node backend/scripts/create_indexes.js` then mark ✅**

**Next Step: Phase 3.4 - Create index migration script**

### Phase 4: Update Core Files
- ✅ **4.1** backend/server.js → add middleware chain + errorHandler

**Next Step: Phase 4.2 - Update routes/controllers (starting with auth)**
- [ ] **4.2** Convert routes/controllers:
  - [ ] auth.js + authController.js (Joi)
  - [ ] order.js + orderController.js (validate create/update)
  - [ ] menu.js + menuController.js (multer → imageCompress)
  - [ ] users.js + usersController.js (profile update)
- [ ] **4.3** middleware/auth.js → JWT refresh support

### Phase 5: Security & Image Optimization
- [ ] **5.1** utils/refreshTokens.js (JWT rotation)
- [ ] **5.2** Test image compression (upload → verify filesize)

### Phase 6: Testing & Verification
- [ ] **6.1** Test all APIs (no breaking changes)
- [ ] **6.2** Rate limit test (artillery / manual)
- [ ] **6.3** Index verification (Mongo shell)
- [ ] **6.4** Load test + monitor

**Next Step: Phase 1.1 - Update package.json**

**Progress Tracker:**
- ✅ User approved plan
- 📝 Ready for implementation
