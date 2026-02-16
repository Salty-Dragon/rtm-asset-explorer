# IPFS Integration Troubleshooting Guide

## Overview

This guide helps troubleshoot IPFS integration issues with the Raptoreum Asset Explorer, specifically when assets with media (images/gifs) display a placeholder "no image" instead of the actual content.

## Problem Symptoms

1. Assets page shows "no image" placeholder for IPFS content
2. Browser console shows error like:
   ```
   /_next/image?url=https://assets.raptoreum.com/ipfs/QmXXXXXXXX...&w=1920&q=75:1
   Failed to load resource: the server responded with a status of 400 ()
   ```
3. IPFS gateway works locally but not through nginx

## Root Cause

The issue occurs when the deployed nginx configuration is missing the IPFS gateway proxy section, preventing nginx from forwarding `/ipfs/*` requests to the local IPFS gateway.

## Solution

### Step 1: Verify Local IPFS Gateway is Running

First, confirm your local IPFS gateway is accessible:

```bash
curl -I "http://127.0.0.1:8080/ipfs/QmS986pnhS5gpyFwLGADu7GStxHyKxQsqi4skt6fBbFdJD"
```

You should see a `200 OK` response with headers like:
```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=29030400, immutable
X-Ipfs-Path: /ipfs/QmS986pnhS5gpyFwLGADu7GStxHyKxQsqi4skt6fBbFdJD
```

### Step 2: Check Your Deployed Nginx Configuration

Check if your deployed nginx config has the IPFS proxy section:

```bash
sudo cat /etc/nginx/sites-available/rtm-asset-explorer | grep -A 15 "IPFS Gateway"
```

### Step 3: Add IPFS Proxy Configuration to Nginx

If the IPFS proxy section is missing, you need to add it to your nginx configuration.

The complete configuration is in the repository at `nginx/rtm-asset-explorer.conf`. The critical section is:

```nginx
# ==================================================
# IPFS Gateway Proxy
# ==================================================
# Proxies /ipfs/* requests to the local IPFS gateway node
# which follows the Raptoreum private IPFS cluster
location /ipfs/ {
    limit_req zone=api_limit burst=20 nodelay;

    proxy_pass http://127.0.0.1:8080/ipfs/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Cache IPFS content (immutable by nature)
    proxy_cache_valid 200 1d;
    add_header Cache-Control "public, max-age=86400";

    # Timeouts for IPFS requests
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

**Important**: This `location /ipfs/` block must be placed **inside** the `server` block that handles HTTPS (port 443), and it should be placed **before** the catch-all `location /` block.

### Step 4: Update Your Nginx Configuration

#### Option A: Replace Entire Config (Recommended)

If you're on a relatively recent version of the repository:

```bash
# Backup current config
sudo cp /etc/nginx/sites-available/rtm-asset-explorer /etc/nginx/sites-available/rtm-asset-explorer.backup

# Copy the updated config from repository
sudo cp /path/to/rtm-asset-explorer/nginx/rtm-asset-explorer.conf /etc/nginx/sites-available/rtm-asset-explorer

# Update any custom values (SSL certificates, ports, etc.)
sudo nano /etc/nginx/sites-available/rtm-asset-explorer

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

#### Option B: Add IPFS Section Manually

If you have custom modifications to your nginx config:

```bash
# Edit the config
sudo nano /etc/nginx/sites-available/rtm-asset-explorer

# Add the IPFS location block shown above inside the server {} block
# Place it BEFORE the "location /" block but AFTER the "location /api/v1/" block

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Step 5: Verify the Fix

After reloading nginx, test that IPFS content is accessible through the domain:

```bash
# Test from the server itself
curl -I "https://assets.raptoreum.com/ipfs/QmS986pnhS5gpyFwLGADu7GStxHyKxQsqi4skt6fBbFdJD"
```

You should see a `200 OK` response.

Then test in your browser by visiting the assets page - images should now load instead of showing placeholders.

## Configuration Details

### How It Works

1. **Browser Request**: User visits `/assets` page, which loads asset cards with IPFS images
2. **Next.js Image Optimization**: The Next.js `<Image>` component requests optimization via `/_next/image?url=https://assets.raptoreum.com/ipfs/[hash]`
3. **Next.js Fetches Image**: Next.js server makes an HTTP request to `https://assets.raptoreum.com/ipfs/[hash]`
4. **Nginx Proxies to IPFS**: Nginx receives the request and proxies it to `http://127.0.0.1:8080/ipfs/[hash]`
5. **IPFS Returns Content**: Local IPFS gateway returns the image content
6. **Next.js Optimizes**: Next.js optimizes the image and serves it to the browser

### Request Flow

```
Browser
  ↓
/_next/image?url=https://assets.raptoreum.com/ipfs/[hash]
  ↓
Next.js Server (port 3003)
  ↓
Fetches: https://assets.raptoreum.com/ipfs/[hash]
  ↓
Nginx (port 443)
  ↓
location /ipfs/ matches
  ↓
proxy_pass http://127.0.0.1:8080/ipfs/
  ↓
Local IPFS Gateway
  ↓
Returns image content
  ↓
Next.js optimizes and caches
  ↓
Returns optimized image to browser
```

## Troubleshooting Additional Issues

### Issue: 502 Bad Gateway for IPFS Requests

**Symptoms**: IPFS requests return 502 errors

**Causes**:
- IPFS daemon is not running
- IPFS is running on a different port

**Solution**:
```bash
# Check if IPFS is running
ps aux | grep ipfs

# Check IPFS status
ipfs id

# Start IPFS daemon if not running
ipfs daemon &

# Or if using systemd
sudo systemctl status ipfs
sudo systemctl start ipfs
```

### Issue: 504 Gateway Timeout for IPFS Requests

**Symptoms**: IPFS requests timeout after 30 seconds

**Causes**:
- IPFS content is not pinned locally
- IPFS node is still fetching content from the network
- IPFS node has connectivity issues

**Solution**:
```bash
# Check if content is available
ipfs cat [hash] | head -c 100

# Pin important content
ipfs pin add [hash]

# Check IPFS swarm connections
ipfs swarm peers

# Increase timeouts in nginx if needed (in location /ipfs/ block):
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

### Issue: Images Load Slowly

**Causes**:
- Content not cached
- IPFS fetching from network
- Need to pre-pin popular content

**Solution**:
```bash
# Pre-pin popular assets
# (Run on backend - this should be part of sync daemon)
ipfs pin add [hash]

# Verify nginx caching is configured (should be in config):
proxy_cache_valid 200 1d;
add_header Cache-Control "public, max-age=86400";
```

### Issue: Some Images Work, Others Don't

**Causes**:
- Specific CIDs not available on local node or network
- Invalid IPFS hashes in database

**Solution**:
```bash
# Test specific hash
ipfs cat [hash] > /tmp/test_image

# Check if hash is valid
ipfs block stat [hash]

# Try fetching from public gateway to verify hash exists
curl "https://ipfs.io/ipfs/[hash]" -I

# If hash is valid but not available, wait for sync or manually pin
ipfs pin add [hash]
```

## Environment Variables

Make sure your environment has the correct IPFS configuration:

### Backend `.env`
```bash
IPFS_LOCAL_GATEWAY=http://127.0.0.1:8080
IPFS_API_URL=http://127.0.0.1:5001
IPFS_PUBLIC_GATEWAY=https://ipfs.io
IPFS_TIMEOUT=10000
IPFS_RETRY_ATTEMPTS=3
```

### Frontend `.env`
```bash
# This should point to your domain, NOT the local gateway
NEXT_PUBLIC_IPFS_GATEWAY_URL=https://assets.raptoreum.com/ipfs
```

## Checking Logs

### Nginx Logs
```bash
# Check nginx error log
sudo tail -f /var/log/nginx/rtm-asset-explorer-error.log

# Check nginx access log for IPFS requests
sudo tail -f /var/log/nginx/rtm-asset-explorer-access.log | grep "/ipfs/"
```

### IPFS Logs
```bash
# If IPFS daemon is running in foreground
# Check the terminal output

# If using systemd
sudo journalctl -u ipfs -f
```

### Application Logs
```bash
# Backend logs (if using PM2)
pm2 logs rtm-backend

# Check for IPFS-related errors
pm2 logs rtm-backend | grep -i ipfs
```

## Prevention: Keeping Configs in Sync

To prevent this issue in the future:

1. **Always use the config from the repository** as the source of truth
2. **Document any custom changes** you make to the deployed config
3. **Test nginx config** before and after updates: `sudo nginx -t`
4. **Keep a backup** of working configs: `sudo cp /etc/nginx/sites-available/rtm-asset-explorer /etc/nginx/sites-available/rtm-asset-explorer.$(date +%Y%m%d)`
5. **Version control your deployed config** by copying it to the repository if you make custom changes

## Related Documentation

- [NGINX_CONFIGURATION.md](./NGINX_CONFIGURATION.md) - Complete nginx setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup including IPFS

## Quick Reference: Complete IPFS Section Location

The IPFS proxy configuration should be in this location within your nginx config:

```nginx
server {
    listen 443 ssl http2;
    # ... SSL configuration ...
    
    # Backend API routes
    location /api/v1/ {
        # ... proxy to backend ...
    }
    
    # IPFS Gateway Proxy <- ADD HERE
    location /ipfs/ {
        # ... IPFS proxy configuration ...
    }
    
    # Frontend routes (catch-all)
    location / {
        # ... proxy to frontend ...
    }
}
```

## Summary

**The most common issue** is that the deployed nginx configuration is missing the IPFS proxy section. The fix is to:

1. Verify IPFS daemon is running locally
2. Add the `/ipfs/` location block to your nginx config
3. Test the config with `sudo nginx -t`
4. Reload nginx with `sudo systemctl reload nginx`
5. Verify images load on the website

The complete, up-to-date nginx configuration is always available in the repository at `nginx/rtm-asset-explorer.conf`.
