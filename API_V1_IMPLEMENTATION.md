# API Versioning Implementation - /api/v1

## Requirement

User wants to use `/api/v1` as the proper API path (versioned API structure).

## Changes Made

### 1. Frontend Configuration

**File: `frontend/lib/constants.ts`**
```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://assets.raptoreum.com/api/v1'
```
✅ Now uses `/api/v1` as default

**File: `frontend/.env.example`**
```bash
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api/v1
```
✅ Updated to include `/v1`

### 2. Backend Routes

**File: `backend/src/server.js`**

All API routes now use `/api/v1` prefix:
```javascript
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/blocks', blockRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/sync', syncRoutes);
```

Root endpoint documentation also updated to show v1 paths.

## API Endpoints

All API endpoints are now at:
- **Health**: `https://assets.raptoreum.com/api/v1/health`
- **Blocks**: `https://assets.raptoreum.com/api/v1/blocks`
- **Transactions**: `https://assets.raptoreum.com/api/v1/transactions/:txid`
- **Assets**: `https://assets.raptoreum.com/api/v1/assets`
- **Addresses**: `https://assets.raptoreum.com/api/v1/addresses/:address`
- **Stats**: `https://assets.raptoreum.com/api/v1/stats`
- **Export**: `https://assets.raptoreum.com/api/v1/export`
- **Sync**: `https://assets.raptoreum.com/api/v1/sync`

## User's Installation Path

User confirmed installation is at:
```
/home/assetx/rtm-asset-explorer
```

Not `/opt/rtm-explorer` as in some documentation.

## What User Needs to Do

### 0. Nginx Configuration (No Changes Needed)

Your nginx configuration is already correct and does not need changes. The configuration:

```nginx
location /api/ {
    proxy_pass http://api_backend;
    # ...
}
```

This works perfectly with `/api/v1` because `proxy_pass http://api_backend;` (without trailing slash) preserves the full request path. When a request comes to `/api/v1/health`, nginx passes it as-is to the backend.

**For detailed nginx configuration information, see [NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md).**

### 1. Restart Backend

```bash
# Stop current backend
# In tmux session with backend, press Ctrl+C

# Navigate to backend
cd /home/assetx/rtm-asset-explorer/backend

# Restart
npm start

# Or if using PM2:
# pm2 restart rtm-api
```

### 2. Rebuild and Restart Frontend

```bash
# Stop current frontend
# In tmux session with frontend, press Ctrl+C

# Navigate to frontend
cd /home/assetx/rtm-asset-explorer/frontend

# Rebuild with new API paths
npm run build

# Restart
npm run start
```

### 3. Update .env Files (if you have them)

**Frontend `.env`:**
```bash
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api/v1
PORT=3003
```

**Backend `.env`:**
```bash
# No changes needed for backend .env
```

## Verification

Test the new API paths:

```bash
# Test backend API directly
curl http://localhost:4004/api/v1/health
# Should return JSON health status

# Test through nginx
curl https://assets.raptoreum.com/api/v1/health
# Should return JSON health status

# Test stats endpoint
curl https://assets.raptoreum.com/api/v1/stats
# Should return JSON with stats

# Test homepage
curl https://assets.raptoreum.com
# Should return HTML (not 500 error)

# Check nginx logs
sudo tail -10 /var/log/nginx/rtm-asset-explorer-access.log
# Should show 200 status codes
```

## Benefits of API Versioning

Using `/api/v1` provides:

1. **Future-proofing**: Can introduce `/api/v2` without breaking existing clients
2. **Clear versioning**: Clients know which API version they're using
3. **Gradual migration**: Old clients can keep using v1 while new ones use v2
4. **Standard practice**: Following REST API best practices

## Timeline

1. Stop backend: **Immediate**
2. Restart backend: **5-10 seconds**
3. Stop frontend: **Immediate**
4. Rebuild frontend: **30-60 seconds**
5. Restart frontend: **5-10 seconds**

**Total: About 1-2 minutes**

## Expected Result

After implementing these changes:
- ✅ API available at `/api/v1/*` endpoints
- ✅ Frontend calls correct versioned endpoints
- ✅ Homepage loads successfully
- ✅ No 500 errors
- ✅ Proper API versioning structure in place

## Notes

- Both frontend and backend now use `/api/v1`
- This matches the structure in API.md documentation
- Most existing documentation already referenced `/api/v1`
- Now implementation matches documentation

## Summary

**What changed:**
- Frontend: Now calls `/api/v1/*` endpoints
- Backend: Routes now at `/api/v1/*` paths
- Both now aligned and using proper API versioning

**What you need to do:**
1. Restart backend: `cd /home/assetx/rtm-asset-explorer/backend && npm start`
2. Rebuild frontend: `cd /home/assetx/rtm-asset-explorer/frontend && npm run build && npm run start`

**Result:** Properly versioned API structure with `/api/v1` prefix throughout.
