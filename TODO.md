# AI Recommendation System V1 Implementation Plan

## Overview
✅ Plan approved by user. Implementing rule-based recommendations using Order/Menu models.

## Steps (Completed: ✅ | In Progress: 🔄 | Pending: ⬜)

### Backend (9 steps)
✅ 1. Create `backend/services/recommendation.service.js` - Core aggregation logic ✓
✅ 2. Create `backend/controllers/recommendationController.js` - Handles GET /:userId ✓
✅ 3. Create `backend/routes/recommendations.js` - Route definition with protect middleware ✓
⬜ 4. Edit `backend/server.js` - Mount /api/recommendations route
⬜ 5. Test backend API endpoint (manual curl/Postman)

### Frontend (6 steps)
⬜ 6. Edit `frontend/src/app/services/order.service.ts` - Add getRecommendations()
⬜ 7. Create `frontend/src/app/components/recommendations/recommendations.component.*` (ts/html/scss)
⬜ 8. Edit `frontend/src/app/components/home/home.component.*` - Add Recommendations section
⬜ 9. Edit `frontend/src/app/components/menu/menu.component.*` - Add Combos section at top
⬜ 10. Update imports/declarations if needed (standalone → just inject)

### Testing & Optimization (3 steps)
⬜ 11. Backend: Test aggregations speed (<300ms), error handling
⬜ 12. Frontend: Test integration, addToCart, responsive, auth-gated
⬜ 13. Add indexes to scripts/create_indexes.js if needed, run `node backend/scripts/create_indexes.js`

## Commands to run after completion:
```
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && ng serve

# Test indexes (optional)
cd backend && node scripts/create_indexes.js
```

**Next step: 7. Create frontend/src/app/components/recommendations/recommendations.component.ts/html/scss**

