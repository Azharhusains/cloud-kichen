# Fix Interceptor Error: "interceptor.intercept is not a function"

## Steps:
- [x] Step 1: Update `frontend/src/app/app.config.ts` to use `withInterceptors([loaderInterceptor, authInterceptor])` instead of mixed DI setup
- [ ] Step 2: Restart Angular dev server (`cd frontend && ng serve`)
- [ ] Step 3: Test `/menu` route - verify categories and menu items load without interceptor errors
- [ ] Step 4: Confirm loader interceptor works (shows/hides on requests) and auth token attaches

**Current Status:** app.config.ts updated successfully. Please restart dev server (Step 2) and test.

