# 500 Error Root Cause Analysis and Fix

## Root Cause Identified

Based on your nginx logs showing a **301 redirect**, requests ARE reaching nginx. The issue is that **the frontend is not running on port 3003**.

### Evidence:
1. ✅ Nginx logs show `"GET / HTTP/1.1" 301` - HTTP to HTTPS redirect works
2. ✅ Backend is running and syncing blocks on port 4004
3. ❌ **Frontend (Next.js) is likely NOT running on port 3003**
4. ❌ When nginx tries to proxy to `http://localhost:3003`, it gets connection refused
5. ❌ This causes nginx to return a 500 error

## Quick Fix - Start the Frontend

### Option 1: Start Frontend Manually (Quick Test)

```bash
# Navigate to frontend directory
cd /opt/rtm-explorer/frontend  # Adjust path to your installation

# Install dependencies if needed
npm install

# Build the frontend for production
npm run build

# Start the frontend on port 3003
PORT=3003 npm start

# Or with your .env file:
npm start  # Make sure .env has PORT=3003
```

The frontend should now be accessible. Test:
```bash
# In another terminal
curl http://localhost:3003
# Should return HTML, not connection refused
```

### Option 2: Add Frontend to PM2 (Production Solution)

**Update backend/ecosystem.config.js** to include the frontend:

```javascript
export default {
  apps: [
    {
      name: 'rtm-api',
      script: './src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      // ... existing config ...
    },
    {
      name: 'rtm-sync',
      script: './src/services/sync-daemon.js',
      // ... existing config ...
    },
    // ADD THIS:
    {
      name: 'rtm-frontend',
      script: 'npm',
      args: 'start',
      cwd: '../frontend',  // Path relative to backend directory
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

Then restart PM2:
```bash
cd /opt/rtm-explorer/backend
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

## Why This Happened

The ecosystem.config.js file only had configuration for:
1. `rtm-api` - Backend API server (port 4004) ✅
2. `rtm-sync` - Sync daemon ✅
3. **Missing**: Frontend Next.js server (port 3003) ❌

## Verification Steps

After starting the frontend, verify everything is working:

```bash
# 1. Check all PM2 processes
pm2 status
# Should show: rtm-api, rtm-sync, AND rtm-frontend all "online"

# 2. Test backend directly
curl http://localhost:4004/api/health
# Should return JSON with health status

# 3. Test frontend directly
curl http://localhost:3003
# Should return HTML (Next.js page)

# 4. Test through nginx (no password if auth disabled, or with --user if enabled)
curl -I https://assets.raptoreum.com
# Should return 200 or 401 (if password protected)

# 5. Check nginx logs
sudo tail -f /var/log/nginx/rtm-asset-explorer-access.log
# Should now show successful requests (200 status)
```

## About the Syncing

You mentioned the backend is syncing blocks. This is **normal and should NOT cause 500 errors**. The sync process runs in the background and doesn't block HTTP requests. The error handling in the backend is correct - it logs sync progress but continues serving requests.

## Expected Behavior After Fix

1. Visit http://assets.raptoreum.com → 301 redirect to HTTPS ✅
2. Visit https://assets.raptoreum.com → See your frontend (or 401 if password protected) ✅
3. Backend API at https://assets.raptoreum.com/api/health → Returns JSON ✅
4. Sync continues in background → Logs show block processing ✅
5. No 500 errors ✅

## Production Setup Checklist

For a complete production setup, ensure:

- [ ] Frontend is built: `cd frontend && npm run build`
- [ ] Frontend is added to PM2 configuration
- [ ] PM2 is running all three services (api, sync, frontend)
- [ ] Nginx config points to correct ports (3003 for frontend, 4004 for API)
- [ ] All services restart on server reboot: `pm2 startup && pm2 save`
- [ ] Logs are being written and rotated properly

## If Issue Persists

If you still get 500 errors after starting the frontend:

1. Check PM2 logs:
   ```bash
   pm2 logs rtm-frontend --lines 50
   ```

2. Check if frontend built successfully:
   ```bash
   cd /opt/rtm-explorer/frontend
   ls -la .next/
   # Should see build output
   ```

3. Check for build errors:
   ```bash
   cd /opt/rtm-explorer/frontend
   npm run build
   # Look for any errors
   ```

4. Test frontend directly without nginx:
   ```bash
   curl -v http://localhost:3003
   # Should connect (not connection refused)
   ```
