# 500 Error Investigation Summary

## Problem Statement

You reported getting a 500 Internal Server Error when accessing https://assets.raptoreum.com with the following symptoms:

- **Error**: `GET https://assets.raptoreum.com/ 500 (Internal Server Error)`
- **No nginx logs**: Nothing in `/var/log/nginx/error.log` or `/var/log/nginx/access.log`
- **Configuration**: Using Cloudflare Origin SSL instead of Let's Encrypt
- **DNS**: A-record is correct

## Root Cause

When you get a **500 error with NO nginx logs**, it means the request is not reaching your nginx server. The error is being returned by Cloudflare **before** it reaches your server. This is a common issue when:

1. **Nginx is configured for Let's Encrypt certificates** but you're using **Cloudflare Origin SSL**
2. **Cloudflare SSL/TLS mode** is not set to "Full (strict)"
3. **Cloudflare Origin Certificate** is not properly installed on your server
4. **Nginx configuration** doesn't reference the Cloudflare certificate paths

## Solution

### Step 1: Install Cloudflare Origin Certificate

1. **Generate certificate in Cloudflare dashboard**:
   - Go to SSL/TLS → Origin Server
   - Click "Create Certificate"
   - Choose RSA (2048), 15 years validity
   - Hostnames: `*.raptoreum.com` and `raptoreum.com`
   - Save both the certificate and private key

2. **Install on your server**:
   ```bash
   # Create directory
   sudo mkdir -p /etc/ssl/cloudflare
   
   # Create certificate file
   sudo nano /etc/ssl/cloudflare/assets.raptoreum.com.pem
   # Paste certificate content
   
   # Create private key file
   sudo nano /etc/ssl/cloudflare/assets.raptoreum.com.key
   # Paste private key content
   
   # Set permissions
   sudo chmod 644 /etc/ssl/cloudflare/assets.raptoreum.com.pem
   sudo chmod 600 /etc/ssl/cloudflare/assets.raptoreum.com.key
   ```

3. **Download Cloudflare Origin CA root certificate**:
   ```bash
   sudo curl -o /etc/ssl/cloudflare/origin_ca_rsa_root.pem \
     https://developers.cloudflare.com/ssl/static/origin_ca_rsa_root.pem
   sudo chmod 644 /etc/ssl/cloudflare/origin_ca_rsa_root.pem
   ```

### Step 2: Update Nginx Configuration

Update your nginx configuration at `/etc/nginx/sites-available/rtm-explorer` to reference the Cloudflare certificates:

**Change these lines:**
```nginx
# OLD (Let's Encrypt paths)
ssl_certificate /etc/letsencrypt/live/assets.raptoreum.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/assets.raptoreum.com/privkey.pem;
```

**To these lines:**
```nginx
# NEW (Cloudflare Origin SSL paths)
ssl_certificate /etc/ssl/cloudflare/assets.raptoreum.com.pem;
ssl_certificate_key /etc/ssl/cloudflare/assets.raptoreum.com.key;
ssl_client_certificate /etc/ssl/cloudflare/origin_ca_rsa_root.pem;
ssl_verify_client off;
```

### Step 3: Configure Cloudflare Real IP

Create `/etc/nginx/conf.d/cloudflare-realip.conf`:

```nginx
# Cloudflare IP ranges
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;

# IPv6
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;

# Use CF-Connecting-IP header
real_ip_header CF-Connecting-IP;
```

### Step 4: Test and Reload Nginx

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx
```

### Step 5: Configure Cloudflare Dashboard

1. **Set SSL/TLS mode**:
   - Go to SSL/TLS → Overview
   - Set to **"Full (strict)"**

2. **Enable HTTPS**:
   - Enable "Always Use HTTPS"
   - Enable "Automatic HTTPS Rewrites"

3. **Check DNS settings**:
   - Ensure A record points to your server IP
   - **Enable orange cloud** (Proxy status: Proxied)

### Step 6: Verify Backend Services

```bash
# Check PM2 status
pm2 status

# Both should show "online":
# - rtm-api (port 4004)
# - rtm-frontend (port 3000)

# If not running, start them:
pm2 start ecosystem.config.js
pm2 save
```

## Quick Diagnostic

Run the diagnostic script to check your configuration:

```bash
# Make executable (if not already)
chmod +x scripts/diagnose-cloudflare-ssl.sh

# Run diagnostic
sudo ./scripts/diagnose-cloudflare-ssl.sh
```

This will check:
- Nginx status and configuration
- Certificate files and permissions
- Port listening status
- Backend services
- DNS and Cloudflare settings
- Recent logs

## Complete Documentation

For complete step-by-step instructions with all configuration details:

**[CLOUDFLARE_SSL_SETUP.md](CLOUDFLARE_SSL_SETUP.md)** - Complete Cloudflare Origin SSL setup guide

## Expected Result

After completing these steps:

1. ✅ https://assets.raptoreum.com loads successfully
2. ✅ Nginx logs show requests in `/var/log/nginx/rtm-explorer-access.log`
3. ✅ SSL Labs test shows A+ rating
4. ✅ Frontend and API are accessible

## If Still Having Issues

1. **Run the diagnostic script** (see above)
2. **Check backend services**: `pm2 logs`
3. **Check nginx logs**: `sudo tail -f /var/log/nginx/rtm-explorer-error.log`
4. **Verify Cloudflare settings**: Dashboard → SSL/TLS → "Full (strict)"
5. **Check firewall**: `sudo ufw status`

## Key Takeaway

**The main issue**: When using Cloudflare with Origin SSL, you cannot use the standard Let's Encrypt configuration. The nginx configuration must be updated to use Cloudflare Origin Certificate paths, and Cloudflare must be set to "Full (strict)" SSL mode.

**Why no nginx logs?**: Because Cloudflare was returning the 500 error at the CDN edge before the request reached your origin server. This happens when there's an SSL handshake failure between Cloudflare and your origin.
