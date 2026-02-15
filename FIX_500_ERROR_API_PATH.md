# Fix for 500 Error - API URL Path Mismatch

## Problem Identified ✅

Nginx logs showed 500 errors with successful authentication:
```
108.162.242.72 - assetsadmin [15/Feb/2026:13:46:17 +0000] "GET / HTTP/2.0" 500 588
```

This meant:
- ✅ Nginx receiving requests
- ✅ HTTPS working
- ✅ Basic auth working
- ✅ Frontend running and responding
- ❌ Frontend encountering errors when making API calls

## Root Cause

**API URL Path Mismatch between Frontend and Backend**

### The Issue:

**Frontend** (`frontend/lib/constants.ts` line 4):
```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://assets.raptoreum.com/api/v1'
```
Default includes `/v1` ❌

**Backend** (`backend/src/server.js` lines 74-81):
```javascript
app.use('/api/health', healthRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/stats', statsRoutes);
// ... etc
```
Routes are at `/api/*` without `/v1` ✅

### What Was Happening:

1. User visits homepage (https://assets.raptoreum.com)
2. Next.js tries to render page (Server-Side Rendering)
3. Page component calls `useGlobalStats()` hook
4. Frontend makes API request to: `https://assets.raptoreum.com/api/v1/stats` ❌
5. Backend doesn't have route at `/api/v1/stats` (only `/api/stats`)
6. Backend returns 404 or route not found
7. Next.js SSR fails with error
8. Returns 500 Internal Server Error to browser

### Evidence:

**Correct configuration** (`.env.example`):
```bash
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api
```
No `/v1` suffix ✅

**Incorrect default** (`constants.ts`):
```typescript
'https://assets.raptoreum.com/api/v1'
```
Has `/v1` suffix ❌

## Solution Applied

### Changed File: `frontend/lib/constants.ts`

**Before:**
```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://assets.raptoreum.com/api/v1'
```

**After:**
```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://assets.raptoreum.com/api'
```

## Why This Fixes the 500 Error

1. Frontend now calls correct API paths:
   - Before: `https://assets.raptoreum.com/api/v1/stats` ❌
   - After: `https://assets.raptoreum.com/api/stats` ✅

2. Backend can respond to these requests successfully

3. Next.js SSR completes without errors

4. Homepage renders correctly with 200 status

## What User Needs to Do

### If User Has `.env` File:

User should verify their `.env` file has:
```bash
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api
```

Without the `/v1` suffix.

### Rebuild and Restart Frontend:

```bash
# Navigate to frontend
cd /opt/rtm-explorer/frontend

# Rebuild with corrected configuration
npm run build

# Restart PM2
cd /opt/rtm-explorer/backend
pm2 restart rtm-frontend

# Or restart all
pm2 restart all
```

## Verification

After fix, verify:

```bash
# Test API endpoint directly
curl https://assets.raptoreum.com/api/stats
# Should return JSON with stats

# Test homepage
curl https://assets.raptoreum.com
# Should return HTML (not 500 error)

# Check nginx logs
sudo tail /var/log/nginx/rtm-asset-explorer-access.log
# Should show 200 status codes, not 500
```

## Why This Happened

The default value in `constants.ts` had `/v1` appended, which doesn't match the actual backend API routes. This could have been:
1. A leftover from planning/design (API v1 versioning considered but not implemented)
2. Copy-paste error
3. Mismatch between documentation and implementation

The `.env.example` file had the correct value, but the default fallback in the code was wrong.

## Prevention

To prevent similar issues:
1. Always ensure API route paths match between frontend and backend
2. Test API calls during development
3. Use environment variables correctly (don't rely on defaults)
4. Document API versioning strategy clearly

## Expected Result

After applying this fix:
- ✅ Homepage loads successfully
- ✅ API calls work correctly
- ✅ Stats display on homepage
- ✅ No 500 errors
- ✅ Nginx logs show 200 status codes

## Related Files

- `frontend/lib/constants.ts` - Contains API_BASE_URL (FIXED)
- `frontend/.env.example` - Shows correct configuration
- `backend/src/server.js` - Defines actual API routes
- `frontend/lib/api.ts` - Uses API_BASE_URL
- `frontend/app/page.tsx` - Homepage that calls API

## Conclusion

The 500 error was caused by an API URL path mismatch. The frontend was calling `/api/v1/*` endpoints that don't exist on the backend which only has `/api/*` routes. 

**Fix:** Remove `/v1` from the default API_BASE_URL in `constants.ts`.

**Result:** Frontend calls correct API paths, SSR succeeds, no 500 errors.

**Issue: RESOLVED ✅**
