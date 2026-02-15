# IMMEDIATE ACTION REQUIRED - 500 Error Fix

## Problem Identified ✅

Your nginx logs show a **301 redirect**, which means requests ARE reaching nginx. The issue is that **the frontend is NOT running on port 3003**.

When nginx tries to proxy the HTTPS request to `http://localhost:3003`, it gets "connection refused", causing a 500 error.

## Quick Fix - Run These Commands Now

```bash
# 1. Navigate to your frontend directory
cd /opt/rtm-explorer/frontend  # Adjust path to your actual installation

# 2. Build the frontend (REQUIRED before starting)
npm run build
# This creates the .next/ directory with production build
# Should complete without errors

# 3. Navigate to backend directory
cd /opt/rtm-explorer/backend

# 4. Stop all PM2 processes
pm2 delete all

# 5. Start everything with updated configuration
pm2 start ecosystem.config.js

# 6. Save PM2 configuration
pm2 save

# 7. Verify all services are running
pm2 status
```

## Expected Output

After running `pm2 status`, you should see:

```
┌─────┬──────────────────┬─────────┬─────────┬───────────┬──────────┐
│ id  │ name             │ mode    │ ↺       │ status    │ cpu      │
├─────┼──────────────────┼─────────┼─────────┼───────────┼──────────┤
│ 0   │ rtm-api          │ cluster │ 0       │ online    │ 0%       │
│ 1   │ rtm-api          │ cluster │ 0       │ online    │ 0%       │
│ 2   │ rtm-sync         │ fork    │ 0       │ online    │ 0%       │
│ 3   │ rtm-frontend     │ fork    │ 0       │ online    │ 0%       │ ← NEW!
└─────┴──────────────────┴─────────┴─────────┴───────────┴──────────┘
```

**CRITICAL:** All four processes (2x rtm-api, 1x rtm-sync, 1x rtm-frontend) must show "online".

## Verification Tests

```bash
# Test 1: Backend API
curl http://localhost:4004/api/health
# Expected: JSON response with status "healthy"

# Test 2: Frontend (THIS IS THE KEY TEST)
curl http://localhost:3003
# Expected: HTML content (not "connection refused")

# Test 3: Via nginx (if no password protection)
curl -I https://assets.raptoreum.com
# Expected: 200 OK (or 401 if password protected)

# Test 4: With password (if you have auth_basic enabled)
curl -I --user username:password https://assets.raptoreum.com
# Expected: 200 OK
```

## What Changed

I've updated your `backend/ecosystem.config.js` to include the frontend:

```javascript
{
  name: 'rtm-frontend',
  script: 'npm',
  args: 'start',
  cwd: '../frontend',
  instances: 1,
  exec_mode: 'fork',
  env: {
    NODE_ENV: 'production',
    PORT: 3003  // Matches your nginx configuration
  },
  // ... logging and restart config
}
```

## Why This Happened

Your original ecosystem.config.js only had:
- ✅ `rtm-api` - Backend API (port 4004)
- ✅ `rtm-sync` - Sync daemon
- ❌ **MISSING**: Frontend (port 3003)

Without the frontend running, nginx couldn't proxy requests to port 3003, resulting in 500 errors.

## About the Syncing

The backend syncing blocks is **completely normal** and does NOT cause 500 errors. The sync runs in the background and doesn't block HTTP requests. Your logs showing:

```
{"level":"info","message":"Processed block 1279530 in 9ms (avg: 9ms)","service":"rtm-api","timestamp":"2026-02-15 13:40:07"}
```

This is expected behavior. The API continues serving requests while syncing happens in the background.

## Common Mistakes to Avoid

1. **Not building the frontend first** - `npm run build` is REQUIRED before `npm start`
2. **Port mismatch** - PM2 config must have PORT: 3003 to match nginx
3. **Frontend not in PM2** - Frontend must be managed by PM2 for production
4. **Not checking pm2 status** - Always verify all services are "online"

## If Frontend Build Fails

If `npm run build` fails, check:

```bash
cd /opt/rtm-explorer/frontend

# Check Node version (should be 24+)
node --version

# Check if dependencies are installed
ls node_modules/ | wc -l
# Should show many packages

# If not, install:
npm install

# Try building again
npm run build
```

## If You Still Get 500 Errors

1. Check PM2 logs:
   ```bash
   pm2 logs rtm-frontend --lines 50
   ```

2. Look for errors in the frontend logs

3. Verify nginx configuration:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. Check what's actually listening:
   ```bash
   sudo netstat -tlnp | grep -E '(3003|4004|443)'
   ```

## Success Indicators

After the fix, you should see:

- ✅ `pm2 status` shows rtm-frontend as "online"
- ✅ `curl http://localhost:3003` returns HTML
- ✅ https://assets.raptoreum.com loads successfully (or shows login)
- ✅ No 500 errors in browser
- ✅ Nginx logs show 200 status codes

## Next Steps After Fix

Once working:

1. **Setup auto-restart on boot:**
   ```bash
   pm2 startup
   # Follow the command it gives you
   pm2 save
   ```

2. **Monitor logs:**
   ```bash
   pm2 logs
   ```

3. **Check system health:**
   ```bash
   pm2 monit
   ```

## Additional Resources

- **ROOT_CAUSE_ANALYSIS.md** - Detailed explanation
- **DEPLOYMENT.md** - Updated with port matching warnings
- **TROUBLESHOOTING_NO_NGINX_LOGS.md** - For Cloudflare-specific issues

## Summary

**The fix is simple:**
1. Build the frontend: `npm run build`
2. Start with PM2: `pm2 start ecosystem.config.js`
3. Verify: `pm2 status` shows all services online
4. Test: Site should work at https://assets.raptoreum.com

The issue was NOT related to Cloudflare, nginx configuration, or backend syncing. It was simply that the frontend wasn't running.
