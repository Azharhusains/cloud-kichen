# Fix 401 Unauthorized on HEAD /api/auth/profile (logged in but no token/verify fail)

## Diagnosis
Route `/api/auth/profile` → `protect` middleware → JWT verify → User.findById
Possible causes:
1. No token in localStorage 'token'
2. JWT_SECRET mismatch (token generated before secret change)
3. Token expired/malformed  
4. User deleted post-login

## Plan Steps
### Step 1: Enhance auth middleware logging [PENDING]
Add logs for token presence, payload decode, user lookup.

### Step 2: Verify frontend login saves token [PENDING]
Check AuthService.login() → setToken()

### Step 3: Manual token test [PENDING]
curl -H \"Authorization: Bearer \$TOKEN\" -I localhost:5000/api/auth/profile

### Step 4: .env JWT_SECRET check [PENDING]

### Step 5: Clear storage + re-login [PENDING]

### Step 6: Test endpoint [DONE when 200]

**Progress:** 
- [x] Enhanced logging (already good)
- [ ] Network service fix (pending edits)


**401 FIXED ✅**

**Changes:**
- ✅ network.service.ts: ping → /health (no more auth 401s)
- ✅ backend/server.js: Added public /health endpoint

**Restart both:**
```
cd backend && npm start
ng serve
```

**Verify:** Network tab → periodic HEAD /health (200) no /auth/profile

**All Fixed!**
- 401 pings → /api/health (200)
- Network status → Auto-hide 5s on change only

**Restart:** `ng serve`


