# Nginx Configuration Guide for /api/v1

## Overview

After PR #18, all backend API endpoints use the `/api/v1` prefix. After PR #25, the frontend Next.js application also has API routes (e.g., `/api/auth` for password protection). Your nginx configuration needs to properly route:
- `/api/v1/*` requests to the backend API server
- Other `/api/*` requests (e.g., `/api/auth`) to the Next.js frontend server

## Important: Configuration Updated for Frontend API Routes ✅

The nginx configuration has been updated to properly route different API paths:

```nginx
location /api/v1/ {
    proxy_pass http://api_backend;
    # ... other settings
}
```

This configuration works because:
1. Requests to `/api/v1/*` match the `/api/v1/` location block and are routed to the backend
2. Requests to other `/api/*` paths (like `/api/auth`) fall through to the Next.js frontend via the catch-all `/` location
3. `proxy_pass http://api_backend;` (without trailing slash) passes the **full request path** to backend
4. Backend receives `/api/v1/health` and handles it correctly

## How It Works

### Request Flow for Backend API
```
Client Request: https://assets.raptoreum.com/api/v1/health
         ↓
Nginx location /api/v1/: Matches ✓
         ↓
proxy_pass http://api_backend;
         ↓
Backend receives: /api/v1/health
         ↓
Backend route: app.use('/api/v1/health', healthRoutes)
         ↓
Response: {"success": true, "data": {...}}
```

### Request Flow for Frontend API
```
Client Request: https://assets.raptoreum.com/api/auth
         ↓
Nginx location /api/v1/: No match
         ↓
Nginx location /: Matches ✓
         ↓
proxy_pass http://frontend_backend;
         ↓
Next.js receives: /api/auth
         ↓
Next.js route: app/api/auth/route.ts
         ↓
Response: {"success": true}
```

## Complete Working Configuration

Here's the complete nginx configuration that works with `/api/v1`:

> **Note**: An example configuration file is available at [nginx/rtm-asset-explorer.conf](nginx/rtm-asset-explorer.conf) that you can copy and customize for your deployment.

> **Important**: The `limit_req_zone` directives shown below must be placed in the nginx http block (in `/etc/nginx/nginx.conf` or `/etc/nginx/conf.d/rate-limits.conf`), not in the site configuration file. See the example config file for detailed instructions.

```nginx
# Rate limiting (place in http block)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=frontend_limit:10m rate=30r/s;

# Upstream servers
upstream api_backend {
    least_conn;
    server 127.0.0.1:4004 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

upstream frontend_backend {
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name assets.raptoreum.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name assets.raptoreum.com;

    # Optional: Basic Auth (if needed)
    # auth_basic "Restricted";
    # auth_basic_user_file /etc/nginx/.htpasswd;

    # SSL Configuration
    ssl_certificate     /etc/ssl/cloudflare/assets.raptoreum.com.pem;
    ssl_certificate_key /etc/ssl/cloudflare/assets.raptoreum.com.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/rtm-asset-explorer-access.log;
    error_log /var/log/nginx/rtm-asset-explorer-error.log;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # API Routes - CRITICAL CONFIGURATION
    # This handles ONLY /api/v1/* requests for the backend API
    # Other /api/* routes (e.g., /api/auth) are handled by Next.js frontend
    location /api/v1/ {
        limit_req zone=api_limit burst=20 nodelay;

        # Pass to backend - keeps full path including /api/v1
        proxy_pass http://api_backend;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_request_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend Routes
    location / {
        limit_req zone=frontend_limit burst=50 nodelay;

        proxy_pass http://frontend_backend;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Static assets
    location /_next/static {
        proxy_pass http://frontend_backend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    location /favicon.ico {
        proxy_pass http://frontend_backend;
        access_log off;
    }

    location /robots.txt {
        proxy_pass http://frontend_backend;
        access_log off;
    }
}
```

## What Changed in PR #18

### Backend Routes (backend/src/server.js)
- **Before**: `app.use('/api/health', healthRoutes)`
- **After**: `app.use('/api/v1/health', healthRoutes)`

All routes now have the `/v1` prefix:
- `/api/v1/health`
- `/api/v1/blocks`
- `/api/v1/transactions`
- `/api/v1/assets`
- `/api/v1/addresses`
- `/api/v1/stats`
- `/api/v1/export`
- `/api/v1/sync`

### Frontend Configuration (frontend/lib/constants.ts)
- **Before**: `API_BASE_URL = 'https://assets.raptoreum.com/api'`
- **After**: `API_BASE_URL = 'https://assets.raptoreum.com/api/v1'`

### Nginx Configuration
- **No changes needed** - your current config already works!

## Troubleshooting 500 Errors

If you're still getting 500 errors after PR #18, follow these steps:

### 1. Verify Services Are Running

```bash
# Check backend
curl http://localhost:4004/api/v1/health
# Expected: {"success":true,"data":{"status":"healthy",...}}

# Check frontend
curl http://localhost:3003
# Expected: HTML page
```

### 2. Restart Backend

The backend must be restarted to load the new route configuration:

```bash
# If using tmux
cd /home/assetx/rtm-asset-explorer/backend
# Press Ctrl+C to stop
npm start

# If using PM2
pm2 restart rtm-api
```

### 3. Rebuild and Restart Frontend

The frontend must be rebuilt to include the new API_BASE_URL:

```bash
# If using tmux
cd /home/assetx/rtm-asset-explorer/frontend
# Press Ctrl+C to stop
npm run build
npm start

# If using PM2
cd /home/assetx/rtm-asset-explorer/frontend
npm run build
pm2 restart rtm-frontend
```

### 4. Verify Nginx Configuration

```bash
# Test nginx config
sudo nginx -t

# Reload nginx (if config changed)
sudo systemctl reload nginx
```

### 5. Check Logs

```bash
# Backend logs (if using tmux, check the tmux session)
# If using PM2:
pm2 logs rtm-api --lines 50

# Frontend logs
pm2 logs rtm-frontend --lines 50

# Nginx access logs
sudo tail -50 /var/log/nginx/rtm-asset-explorer-access.log

# Nginx error logs
sudo tail -50 /var/log/nginx/rtm-asset-explorer-error.log
```

### 6. Test Through Nginx

```bash
# Test API through nginx
curl -v https://assets.raptoreum.com/api/v1/health

# Test stats endpoint
curl https://assets.raptoreum.com/api/v1/stats

# Test homepage
curl https://assets.raptoreum.com
```

## Common Issues

### Issue: 404 Not Found

**Symptom**: Requests to `/api/v1/*` return 404

**Cause**: Backend not restarted after PR #18

**Solution**:
```bash
cd /home/assetx/rtm-asset-explorer/backend
# Stop backend (Ctrl+C in tmux or pm2 restart)
npm start
```

### Issue: 500 Internal Server Error on Frontend

**Symptom**: Frontend loads but shows 500 error

**Cause**: Frontend making API calls to old `/api/*` paths instead of `/api/v1/*`

**Solution**:
```bash
cd /home/assetx/rtm-asset-explorer/frontend
npm run build  # Rebuild with new API_BASE_URL
npm start      # Restart
```

### Issue: Connection Refused

**Symptom**: `502 Bad Gateway` or connection refused errors

**Cause**: Backend or frontend service not running

**Solution**:
```bash
# Check if services are running
netstat -tlnp | grep -E ":(3003|4004)"

# Start services if not running
cd /home/assetx/rtm-asset-explorer/backend && npm start &
cd /home/assetx/rtm-asset-explorer/frontend && npm start &
```

### Issue: CORS Errors

**Symptom**: CORS errors in browser console

**Cause**: Mismatch between frontend URL and API URL

**Solution**: Verify your frontend `.env` file has:
```bash
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api/v1
```

## Verification Checklist

After configuration, verify everything works:

- [ ] Backend responds: `curl http://localhost:4004/api/v1/health`
- [ ] Frontend responds: `curl http://localhost:3003`
- [ ] Nginx test passes: `sudo nginx -t`
- [ ] API through nginx: `curl https://assets.raptoreum.com/api/v1/health`
- [ ] Stats endpoint: `curl https://assets.raptoreum.com/api/v1/stats`
- [ ] Homepage loads: `curl https://assets.raptoreum.com`
- [ ] No 500 errors in nginx logs
- [ ] No 404 errors for `/api/v1/*` paths

## Why This Configuration Works

### Without Trailing Slash in proxy_pass

```nginx
location /api/v1/ {
    proxy_pass http://api_backend;  # ← No trailing slash
}
```

When nginx sees this configuration:
- Request: `/api/v1/health`
- Matches: `/api/` location
- Passes to backend: `/api/v1/health` (full path preserved)

### With Trailing Slash in proxy_pass (INCORRECT)

```nginx
location /api/v1/ {
    proxy_pass http://api_backend/;  # ← Trailing slash
}
```

This would strip the `/api/v1/` prefix:
- Request: `/api/v1/health`
- Matches: `/api/v1/` location
- Passes to backend: `/health` (prefix stripped)
- Backend expects: `/api/v1/health`
- Result: **404 Not Found** ❌

## Summary

✅ **Your nginx configuration is correct**
✅ **No nginx changes needed for /api/v1**
✅ **Just restart backend and rebuild frontend**

The key is that `proxy_pass http://api_backend;` (without trailing slash) preserves the full request path, allowing `/api/v1/*` requests to reach the backend's `/api/v1/*` routes.

## Need Help?

If you're still experiencing issues after:
1. Restarting backend
2. Rebuilding and restarting frontend
3. Verifying nginx configuration

Check these:
- Backend logs for errors
- Frontend logs for API call failures
- Nginx error logs for proxy issues
- Network connectivity between nginx and services
- Firewall rules allowing internal connections

## Quick Commands Reference

```bash
# Restart Backend
cd /home/assetx/rtm-asset-explorer/backend && npm start

# Rebuild + Restart Frontend
cd /home/assetx/rtm-asset-explorer/frontend && npm run build && npm start

# Test Backend
curl http://localhost:4004/api/v1/health

# Test Frontend
curl http://localhost:3003

# Test Through Nginx
curl https://assets.raptoreum.com/api/v1/health

# Check Nginx Logs
sudo tail -f /var/log/nginx/rtm-asset-explorer-error.log
```

## Example Configuration Files

Ready-to-use nginx configuration files are available in the [nginx/](nginx/) directory:

- **[nginx/rtm-asset-explorer.conf](nginx/rtm-asset-explorer.conf)** - Complete configuration with detailed comments
- **[nginx/README.md](nginx/README.md)** - Quick setup guide

You can copy these files directly to your server and customize them for your deployment.
