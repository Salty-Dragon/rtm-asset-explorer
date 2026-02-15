# Quick Start - /api/v1 Implementation

## ✅ What Changed

**Frontend and Backend now use `/api/v1` for all API endpoints**

## 🚀 What You Need to Do

### Your Path
```
/home/assetx/rtm-asset-explorer
```

### Step 1: Restart Backend (in tmux)

```bash
# In your backend tmux session:
# Press: Ctrl+C

cd /home/assetx/rtm-asset-explorer/backend
npm start
```

### Step 2: Rebuild & Restart Frontend (in tmux)

```bash
# In your frontend tmux session:
# Press: Ctrl+C

cd /home/assetx/rtm-asset-explorer/frontend
npm run build && npm run start
```

## ⏱️ Timeline

- Backend restart: **5-10 seconds**
- Frontend rebuild: **30-60 seconds**
- Frontend start: **5-10 seconds**
- **Total: About 1 minute**

## ✅ Verify It Works

```bash
# Test API v1 endpoint
curl http://localhost:4004/api/v1/health
# Should return: {"success":true,"data":{"status":"healthy",...}}

# Test through nginx
curl https://assets.raptoreum.com/api/v1/stats
# Should return JSON with stats

# Test homepage
curl https://assets.raptoreum.com
# Should return HTML (not 500 error)

# Check nginx logs
sudo tail -5 /var/log/nginx/rtm-asset-explorer-access.log
# Should show 200 status codes
```

## 📍 All API Endpoints Now At

- `https://assets.raptoreum.com/api/v1/health`
- `https://assets.raptoreum.com/api/v1/stats`
- `https://assets.raptoreum.com/api/v1/assets`
- `https://assets.raptoreum.com/api/v1/blocks`
- `https://assets.raptoreum.com/api/v1/transactions`
- `https://assets.raptoreum.com/api/v1/addresses`
- `https://assets.raptoreum.com/api/v1/export`
- `https://assets.raptoreum.com/api/v1/sync`

## 📝 Optional: Update Your .env

If you have a frontend `.env` file, ensure it has:

```bash
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api/v1
PORT=3003
```

## ✨ Benefits

- ✅ Proper API versioning (v1)
- ✅ Can add v2 in future without breaking v1
- ✅ Matches documentation
- ✅ Industry best practice
- ✅ Frontend and backend aligned

## 🎯 Expected Result

After restart:
- ✅ API works at `/api/v1/*` paths
- ✅ Homepage loads successfully
- ✅ No 500 errors
- ✅ Nginx shows 200 status codes
- ✅ Proper versioned API structure

## 💡 That's It!

Just restart both services and you're done. The code is already updated and ready to go.

---

**Your installation: `/home/assetx/rtm-asset-explorer`**
