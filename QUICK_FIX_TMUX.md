# Quick Fix for 500 Error (tmux Setup)

## The Problem
Your frontend is calling `/api/v1/*` but the backend only has `/api/*` routes.

## The Fix
I've already fixed the code by removing `/v1` from the API URL in `frontend/lib/constants.ts`.

## What You Need to Do Now

### Option 1: Quick Restart (Fastest)

```bash
# 1. Go to your tmux session where frontend is running
# 2. Stop the frontend: Ctrl+C
# 3. Rebuild and restart:
cd /path/to/your/frontend  # e.g., cd /opt/rtm-explorer/frontend
npm run build && npm run start
```

### Option 2: Step by Step

```bash
# 1. In your tmux session with frontend:
# Press Ctrl+C to stop the current process

# 2. Navigate to frontend directory
cd /opt/rtm-explorer/frontend  # or wherever your frontend is

# 3. Rebuild the frontend
npm run build
# Wait for build to complete (should take 30-60 seconds)

# 4. Start the frontend again
npm run start
# Should show: "ready - started server on 0.0.0.0:3003"
```

## Verify It Works

```bash
# In a new terminal, test the API:
curl https://assets.raptoreum.com/api/stats
# Should return JSON with stats, not a 404

# Test the homepage:
curl https://assets.raptoreum.com
# Should return HTML, not a 500 error

# Check nginx logs:
sudo tail -5 /var/log/nginx/rtm-asset-explorer-access.log
# Should show 200 status codes
```

## What Changed

**Before:**
- Frontend called: `https://assets.raptoreum.com/api/v1/stats` ❌
- Backend only has: `https://assets.raptoreum.com/api/stats` ✅
- Result: 404 → SSR fails → 500 error

**After:**
- Frontend calls: `https://assets.raptoreum.com/api/stats` ✅
- Backend responds successfully ✅
- Result: Page loads, no 500 error ✅

## If You Use .env File

Make sure your frontend `.env` file has:
```bash
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api
```

Without `/v1` at the end.

## Backend Still Syncing?

That's normal! The backend logs showing:
```
{"level":"info","message":"Processed block 1279530 in 9ms (avg: 9ms)"}
```

This is completely fine and not related to the 500 error. The syncing happens in the background and doesn't affect page loading.

## Troubleshooting

### If build fails:
```bash
# Make sure dependencies are installed
npm install

# Then try building again
npm run build
```

### If port 3003 already in use:
```bash
# Check what's using port 3003
sudo netstat -tlnp | grep 3003

# Kill the old process if needed
# Then start again
```

### If still getting 500 errors:
```bash
# Check frontend logs in your tmux session
# Look for any error messages

# Test API directly:
curl http://localhost:3003
# Should return HTML

curl http://localhost:4004/api/stats
# Should return JSON
```

## Expected Timeline

1. Stop frontend: **Immediate**
2. Rebuild: **30-60 seconds**
3. Restart: **5-10 seconds**
4. Test: **Works immediately**

Total time: **About 1 minute**

## Summary

**What I fixed:** Removed `/v1` from API URL in the code
**What you do:** Rebuild and restart frontend in your tmux session
**Result:** Homepage loads, no more 500 errors

That's it! Simple fix, quick restart.
