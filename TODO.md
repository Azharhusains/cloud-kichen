# Production Deployment Plan - Cloud Kitchen Backend

## Steps:
- [x] 1. Update package.json (deps, scripts)
- [x] 2. Create middleware/rateLimit.js
- [x] 3. Update server.js (CORS, rate limit, compression, listen '0.0.0.0', prod errors)
- [x] 4. Update config/database.js (retry logic)
- [x] 5. Update controllers/authController.js (remove localhost CLIENT_URL)
- [x] 6. Create .env.example
- [x] 7. Create .gitignore (add .env)
- [x] 8. Create README.md (deploy instructions)
- [ ] 9. npm install && test locally
- [ ] 10. Deploy to Render + verify
