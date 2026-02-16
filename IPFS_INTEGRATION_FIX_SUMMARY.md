# IPFS Integration Fix Summary

## Issue Description

**Problem**: Assets with media (images/gifs) display a placeholder "no image" instead of actual IPFS content on the `/assets` page.

**Error in Browser Console**:
```
/_next/image?url=https%3A%2F%2Fassets.raptoreum.com%2Fipfs%2FQma86pMCzA98CuZaXFqyRwefrwHdPr4SXyLCLunQPa5R4&w=1920&q=75:1
Failed to load resource: the server responded with a status of 400 ()
```

**Verified Working**:
- Local IPFS gateway is operational: `http://127.0.0.1:8080/ipfs/`
- Test command confirms IPFS is running:
  ```bash
  curl -I "http://127.0.0.1:8080/ipfs/QmS986pnhS5gpyFwLGADu7GStxHyKxQsqi4skt6fBbFdJD"
  # Returns: HTTP/1.1 200 OK
  ```

## Root Cause

The deployed nginx configuration is **missing the IPFS proxy section** that forwards `/ipfs/*` requests to the local IPFS gateway.

### How IPFS Image Loading Works

1. **Frontend Request**: Browser loads `/assets` page with asset cards
2. **Next.js Image Optimization**: `<Image>` component requests: `/_next/image?url=https://assets.raptoreum.com/ipfs/[hash]`
3. **Next.js Fetches Image**: Next.js server makes internal HTTP request to `https://assets.raptoreum.com/ipfs/[hash]`
4. **Nginx Must Proxy**: Nginx needs to proxy this request to `http://127.0.0.1:8080/ipfs/[hash]`
5. **IPFS Returns Content**: Local IPFS gateway serves the image
6. **Next.js Serves Optimized Image**: Next.js optimizes and caches the image for the browser

**Without the nginx proxy**: Step 4 fails → Next.js cannot fetch the image → Browser displays "no image" placeholder

## Solution

### The Fix

Add the IPFS proxy configuration to your deployed nginx config file:

```nginx
# ==================================================
# IPFS Gateway Proxy
# ==================================================
# ⚠️ CRITICAL: This section is REQUIRED for asset images to load!
# Without this, images will show "no image" placeholders.
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

**Location in Config**: This block must be inside the `server {}` block that handles HTTPS (port 443), placed AFTER the `/api/v1/` location and BEFORE the catch-all `/` location.

### Implementation Steps

1. **Backup Current Config**:
   ```bash
   sudo cp /etc/nginx/sites-available/rtm-asset-explorer /etc/nginx/sites-available/rtm-asset-explorer.backup
   ```

2. **Option A: Use Complete Config from Repository (Recommended)**:
   ```bash
   # Copy the complete, up-to-date configuration
   sudo cp /path/to/rtm-asset-explorer/nginx/rtm-asset-explorer.conf /etc/nginx/sites-available/rtm-asset-explorer
   
   # Edit for your environment (SSL certs, server_name, ports)
   sudo nano /etc/nginx/sites-available/rtm-asset-explorer
   ```

3. **Option B: Add IPFS Section Manually**:
   ```bash
   # Edit your existing config
   sudo nano /etc/nginx/sites-available/rtm-asset-explorer
   
   # Add the IPFS location block shown above
   # Place it after /api/v1/ and before location /
   ```

4. **Test Configuration**:
   ```bash
   sudo nginx -t
   ```

5. **Reload Nginx** (only if test passes):
   ```bash
   sudo systemctl reload nginx
   ```

6. **Verify the Fix**:
   ```bash
   # Test IPFS endpoint from server
   curl -I "https://assets.raptoreum.com/ipfs/QmS986pnhS5gpyFwLGADu7GStxHyKxQsqi4skt6fBbFdJD"
   # Should return: HTTP/2 200
   
   # Visit the website
   # Asset images should now load instead of showing placeholders
   ```

## What Changed in This PR

### New Files Created

1. **IPFS_TROUBLESHOOTING.md** (9,904 bytes)
   - Comprehensive troubleshooting guide for IPFS integration
   - Step-by-step solution for missing nginx proxy
   - Common issues and their solutions
   - Request flow diagrams
   - Environment variable documentation
   - Log checking instructions

### Files Updated

2. **DEPLOYMENT.md**
   - Updated nginx configuration section
   - Added warning about IPFS proxy requirement
   - Changed to recommend using complete config from repository
   - Moved old manual config to collapsible section
   - Added note about common missing IPFS issue

3. **NGINX_CONFIGURATION.md**
   - Added critical warning about IPFS proxy at top
   - Added IPFS request flow diagram
   - Updated overview to include IPFS routing

4. **README.md**
   - Added reference to IPFS_TROUBLESHOOTING.md in documentation list

5. **nginx/rtm-asset-explorer.conf**
   - Enhanced header comments with critical sections
   - Added prominent warning about IPFS requirement
   - Added reference to IPFS_TROUBLESHOOTING.md
   - Improved inline documentation for IPFS location block

## Why This Issue Occurred

The nginx configuration file in the repository (`nginx/rtm-asset-explorer.conf`) **already had** the IPFS proxy configuration (added previously). However:

1. **Deployment Documentation Gap**: The DEPLOYMENT.md file showed a sample nginx config that was missing the IPFS section
2. **Copy-Paste Issue**: Users copying the sample config from DEPLOYMENT.md would miss the IPFS proxy
3. **Manual Configuration**: Users manually creating configs might not realize IPFS proxying is required
4. **No Clear Warning**: The nginx config file didn't have prominent warnings about the IPFS section being critical

## Prevention Measures Implemented

To prevent this issue in the future:

1. ✅ **Prominent Documentation**: Created dedicated IPFS_TROUBLESHOOTING.md
2. ✅ **Updated Deployment Guide**: DEPLOYMENT.md now emphasizes using the complete config file
3. ✅ **Enhanced Config Comments**: Added critical warnings in the nginx config file itself
4. ✅ **Multiple References**: Added cross-references between documentation files
5. ✅ **Visual Markers**: Used ⚠️ symbols to highlight critical sections
6. ✅ **Complete Example**: Repository config file is the source of truth

## Technical Details

### Configuration Requirements

**Required nginx sections** (in order):
1. Rate limiting zones (in http block)
2. Upstream definitions
3. HTTP → HTTPS redirect server block
4. HTTPS server block containing:
   - SSL configuration
   - `/api/v1/` location (backend API)
   - **`/ipfs/` location (IPFS proxy)** ← Critical!
   - `/` location (frontend catch-all)

### Why Each Component is Needed

- **Frontend (`next.config.js`)**: Already configured with `remotePatterns` for `assets.raptoreum.com/ipfs/**`
- **Frontend (`lib/constants.ts`)**: Already set `IPFS_GATEWAY_URL = https://assets.raptoreum.com/ipfs`
- **Next.js Image Component**: Uses Next.js Image Optimization API to fetch and optimize IPFS images
- **Nginx `/ipfs/` location**: Proxies IPFS requests to local gateway, enabling Next.js to fetch images
- **Local IPFS Gateway**: Serves IPFS content at `http://127.0.0.1:8080/ipfs/`

### Complete Request Flow

```
Browser
  ↓
Request: Load /assets page
  ↓
Next.js renders <IPFSImage cid="Qm..." />
  ↓
Next.js Image component generates:
  <img src="/_next/image?url=https://assets.raptoreum.com/ipfs/Qm...&w=400&q=75" />
  ↓
Next.js Image API (internal) fetches source image:
  GET https://assets.raptoreum.com/ipfs/Qm...
  ↓
Request hits Nginx (same domain)
  ↓
Nginx: location /ipfs/ matches ✓
  ↓
Nginx proxies to: http://127.0.0.1:8080/ipfs/Qm...
  ↓
Local IPFS gateway returns image data
  ↓
Next.js receives image data
  ↓
Next.js optimizes image (resize, quality, format)
  ↓
Next.js caches optimized image
  ↓
Browser receives and displays optimized image ✓
```

**If nginx /ipfs/ location is missing**:
- Next.js tries to fetch `https://assets.raptoreum.com/ipfs/Qm...`
- Nginx has no matching location block
- Returns 404 or passes to wrong backend
- Next.js Image API returns 400 error
- Browser displays placeholder "no image"

## Verification Checklist

After deploying the fix, verify:

- [ ] IPFS daemon is running: `ps aux | grep ipfs`
- [ ] IPFS responds locally: `curl -I http://127.0.0.1:8080/ipfs/[hash]` returns 200
- [ ] Nginx config has `/ipfs/` location block
- [ ] Nginx config test passes: `sudo nginx -t`
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] IPFS works through domain: `curl -I https://assets.raptoreum.com/ipfs/[hash]` returns 200
- [ ] Website loads assets: Visit `/assets` page, images should appear
- [ ] Browser console clean: No 400 errors for `/_next/image` requests
- [ ] Next.js logs clean: `pm2 logs rtm-frontend` shows no IPFS errors

## Related Documentation

- **[IPFS_TROUBLESHOOTING.md](./IPFS_TROUBLESHOOTING.md)** - Complete troubleshooting guide (NEW)
- **[NGINX_CONFIGURATION.md](./NGINX_CONFIGURATION.md)** - Nginx configuration guide (UPDATED)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment procedures (UPDATED)
- **[nginx/rtm-asset-explorer.conf](./nginx/rtm-asset-explorer.conf)** - Complete nginx config (UPDATED)

## Summary

**Problem**: Missing IPFS proxy in nginx config prevents asset images from loading.

**Solution**: Add IPFS proxy section to nginx config or use the complete config from the repository.

**Files Changed**: 
- Created: IPFS_TROUBLESHOOTING.md
- Updated: DEPLOYMENT.md, NGINX_CONFIGURATION.md, README.md, nginx/rtm-asset-explorer.conf

**Result**: Clear documentation and prominent warnings to prevent this issue in the future. The fix requires updating the deployed nginx configuration on the server - no code changes needed as the application already supports IPFS correctly.

**Action Required**: Server administrator needs to update the nginx config on the production server to include the IPFS proxy section.
