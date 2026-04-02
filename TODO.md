# Cloud Kitchen Advanced Features Implementation TODO

## Approved Plan Summary
- Sustainability tracking (carbonScore in Order + UI)
- Multi-language support (i18n EN/HI)
- Dark mode toggle (localStorage)
- Push notifications (order updates)
- AR menu preview (optional 3D structure)

Status: [ ] 0% Complete

## Step-by-Step Breakdown

### Phase 1: Backend Updates (Steps 1-4)
- [ ] **Step 1**: Update `backend/models/Order.js` - Add carbonScore field
- [ ] **Step 2**: Update `backend/models/MenuItem.js` - Add modelUrl field  
- [ ] **Step 3**: Update `backend/controllers/orderController.js` - Add carbonScore calculation logic
- [ ] **Step 4**: Minor updates to order routes/controller for new fields/notifications

### Phase 2: Frontend Core Setup (Steps 5-9)
- [ ] **Step 5**: Install Angular i18n/pwa/three.js deps (`cd frontend && ng add @angular/pwa && npm i three @types/three @angular/localize`)
- [ ] **Step 6**: Update `frontend/angular.json` - Enable i18n, service worker
- [ ] **Step 7**: Implement dark mode in `app.component.ts/scss` + global styles
- [ ] **Step 8**: Create i18n files (`messages.en.xlf`, `messages.hi.xlf`) and add attributes to templates
- [ ] **Step 9**: Add language toggle to `navigation.component.html/ts`

### Phase 3: Feature Integrations (Steps 10-14)
- [ ] **Step 10**: Add carbonScore display to `order-tracking.component.html/ts`, `cart.component.html`, `checkout`
- [ ] **Step 11**: Setup push notifications (Service Worker + order.service.ts)
- [ ] **Step 12**: Add AR preview component and button to `menu.component.html`
- [ ] **Step 13**: Update orderController.js for push triggers on status change
- [ ] **Step 14**: Test all features, fix issues

### Phase 4: Completion
- [ ] **Step 15**: Full testing, DB migration script if needed, attempt_completion

*Current Step: 4/15*
*Next Action: Install frontend deps & update angular.json (Phase 2)*

**Progress will be updated after each completed step.**
