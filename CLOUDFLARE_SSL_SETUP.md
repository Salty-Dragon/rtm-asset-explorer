# Cloudflare Origin SSL Configuration Guide

This guide provides step-by-step instructions for configuring Nginx with Cloudflare Origin Certificates instead of Let's Encrypt.

## Problem Overview

When using Cloudflare with Origin SSL certificates, the standard Let's Encrypt nginx configuration will not work. The main differences are:

1. **Certificate Path**: Cloudflare Origin Certificates are stored in a different location
2. **Certificate Chain**: Cloudflare provides a specific origin certificate chain
3. **Real IP Headers**: Cloudflare acts as a reverse proxy, requiring special handling for visitor IPs
4. **SSL Configuration**: Different SSL settings are needed for Cloudflare's infrastructure

## Common Symptoms

If you experience the following symptoms, you likely have a Cloudflare SSL configuration issue:

- **500 Internal Server Error** when accessing the site via HTTPS
- **No logs** in nginx `access.log` or `error.log` (requests don't reach nginx)
- **SSL handshake failures** at the Cloudflare level
- Cloudflare dashboard shows "Error 521: Web Server Is Down"

## Prerequisites

Before starting, ensure you have:

1. **Cloudflare Account** with your domain configured
2. **Origin Certificate** generated from Cloudflare dashboard
3. **Cloudflare SSL/TLS Mode** set to "Full (strict)" in Cloudflare dashboard
4. **DNS A Record** pointing to your OVH server IP address
5. **Orange Cloud** enabled in Cloudflare DNS settings (proxied)

## Step 1: Generate Cloudflare Origin Certificate

1. Log in to your Cloudflare dashboard
2. Select your domain (raptoreum.com)
3. Navigate to **SSL/TLS** → **Origin Server**
4. Click **Create Certificate**
5. Choose the following settings:
   - **Private key type**: RSA (2048)
   - **Certificate validity**: 15 years (maximum)
   - **Hostnames**: `*.raptoreum.com` and `raptoreum.com`
6. Click **Create**
7. Copy both:
   - **Origin Certificate** (starts with `-----BEGIN CERTIFICATE-----`)
   - **Private Key** (starts with `-----BEGIN PRIVATE KEY-----`)

## Step 2: Install Origin Certificate on Server

```bash
# Create directory for Cloudflare certificates
sudo mkdir -p /etc/ssl/cloudflare

# Create origin certificate file
sudo nano /etc/ssl/cloudflare/assets.raptoreum.com.pem
# Paste the Origin Certificate content and save

# Create private key file
sudo nano /etc/ssl/cloudflare/assets.raptoreum.com.key
# Paste the Private Key content and save

# Set proper permissions
sudo chmod 644 /etc/ssl/cloudflare/assets.raptoreum.com.pem
sudo chmod 600 /etc/ssl/cloudflare/assets.raptoreum.com.key
sudo chown root:root /etc/ssl/cloudflare/assets.raptoreum.com.*
```

## Step 3: Install Cloudflare Origin CA Root Certificate

Cloudflare Origin Certificates need to be validated against Cloudflare's origin CA root certificate.

```bash
# Download Cloudflare Origin CA root certificate
sudo curl -o /etc/ssl/cloudflare/origin_ca_rsa_root.pem https://developers.cloudflare.com/ssl/static/origin_ca_rsa_root.pem

# Verify the certificate was downloaded
sudo cat /etc/ssl/cloudflare/origin_ca_rsa_root.pem

# Set proper permissions
sudo chmod 644 /etc/ssl/cloudflare/origin_ca_rsa_root.pem
```

## Step 4: Configure Cloudflare Real IP Module

Since Cloudflare acts as a reverse proxy, you need to configure Nginx to get the real visitor IP from Cloudflare headers.

```bash
# Create Cloudflare IP configuration file
sudo nano /etc/nginx/conf.d/cloudflare-realip.conf
```

Add the following content:

```nginx
# Cloudflare IP ranges
# Update these periodically from https://www.cloudflare.com/ips/

# IPv4
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

## Step 5: Update Nginx Site Configuration

Update your nginx site configuration to use Cloudflare Origin Certificates:

```bash
sudo nano /etc/nginx/sites-available/rtm-explorer
```

Replace with the following configuration:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=frontend_limit:10m rate=30r/s;

# Upstream servers
upstream api_backend {
    least_conn;
    server 127.0.0.1:4004 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

upstream frontend_backend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name assets.raptoreum.com;
    
    # When using Cloudflare, all traffic comes through HTTPS
    # This redirect is mainly for direct server access
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server - Cloudflare Origin SSL
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name assets.raptoreum.com;

    # ============================================
    # CLOUDFLARE ORIGIN SSL CONFIGURATION
    # ============================================
    
    # Cloudflare Origin Certificate
    ssl_certificate /etc/ssl/cloudflare/assets.raptoreum.com.pem;
    ssl_certificate_key /etc/ssl/cloudflare/assets.raptoreum.com.key;
    
    # Cloudflare Origin CA root certificate for validation
    ssl_client_certificate /etc/ssl/cloudflare/origin_ca_rsa_root.pem;
    ssl_verify_client off;  # Set to 'on' for authenticated origin pulls

    # SSL Settings optimized for Cloudflare
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    
    # OCSP Stapling (not needed with Cloudflare Origin Certificates)
    # ssl_stapling off;
    # ssl_stapling_verify off;

    # ============================================
    # SECURITY HEADERS
    # ============================================
    
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Cloudflare-specific headers (informational)
    add_header X-Served-By "Cloudflare-Origin" always;

    # ============================================
    # LOGGING
    # ============================================
    
    # Log real visitor IP from Cloudflare
    log_format cloudflare '$http_cf_connecting_ip - $remote_user [$time_local] '
                         '"$request" $status $body_bytes_sent '
                         '"$http_referer" "$http_user_agent" '
                         'country=$http_cf_ipcountry ray=$http_cf_ray';
    
    access_log /var/log/nginx/rtm-explorer-access.log cloudflare;
    error_log /var/log/nginx/rtm-explorer-error.log;

    # ============================================
    # COMPRESSION
    # ============================================
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # ============================================
    # API ROUTES
    # ============================================
    
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        
        # Pass real visitor IP from Cloudflare
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Pass Cloudflare-specific headers
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-IPCountry $http_cf_ipcountry;
        proxy_set_header CF-Ray $http_cf_ray;
        proxy_set_header CF-Visitor $http_cf_visitor;
        
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_request_buffering off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ============================================
    # FRONTEND ROUTES
    # ============================================
    
    location / {
        limit_req zone=frontend_limit burst=50 nodelay;
        
        proxy_pass http://frontend_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        
        # Pass real visitor IP from Cloudflare
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Pass Cloudflare-specific headers
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-IPCountry $http_cf_ipcountry;
        
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # ============================================
    # STATIC ASSETS
    # ============================================
    
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

## Step 6: Test and Apply Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx

# Monitor error logs
sudo tail -f /var/log/nginx/rtm-explorer-error.log
```

## Step 7: Configure Cloudflare Settings

In the Cloudflare dashboard, ensure these settings are correct:

### SSL/TLS Settings
1. Navigate to **SSL/TLS** → **Overview**
2. Set SSL/TLS encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**

### DNS Settings
1. Navigate to **DNS**
2. Ensure A record for `assets.raptoreum.com` points to your OVH server IP
3. **Enable** the orange cloud (Proxy status: Proxied) - This is critical!

### Firewall Settings (Optional)
1. Navigate to **Security** → **WAF**
2. Consider enabling **Bot Fight Mode** for additional protection
3. Set up **Rate Limiting** rules if needed

### Page Rules (Optional)
1. Navigate to **Rules** → **Page Rules**
2. Consider adding cache rules for static assets

## Troubleshooting

### Issue: Still getting 500 error

**Solution:**
1. Check if backend services are running:
```bash
pm2 status
```

2. Test API directly:
```bash
curl http://localhost:4004/api/health
```

3. Test frontend directly:
```bash
curl http://localhost:3000
```

4. Check nginx error logs:
```bash
sudo tail -f /var/log/nginx/rtm-explorer-error.log
```

### Issue: Cloudflare shows "Error 521: Web Server Is Down"

**Solution:**
1. Verify nginx is running:
```bash
sudo systemctl status nginx
```

2. Check if ports 80 and 443 are listening:
```bash
sudo netstat -tlnp | grep -E ':(80|443)'
```

3. Ensure firewall allows traffic from Cloudflare IPs:
```bash
# Allow Cloudflare IPs
sudo ufw allow from 173.245.48.0/20 to any port 443 proto tcp
sudo ufw allow from 103.21.244.0/22 to any port 443 proto tcp
# ... add other Cloudflare IP ranges
```

### Issue: Real visitor IPs not being logged

**Solution:**
1. Verify Cloudflare Real IP configuration is loaded:
```bash
sudo nginx -T | grep real_ip_from
```

2. Check if CF-Connecting-IP header is present:
```bash
# In your application logs, log the CF-Connecting-IP header
```

### Issue: SSL handshake errors

**Solution:**
1. Verify certificate files are readable:
```bash
sudo ls -la /etc/ssl/cloudflare/
```

2. Test SSL configuration:
```bash
sudo openssl s_client -connect localhost:443 -servername assets.raptoreum.com
```

3. Check certificate validity:
```bash
sudo openssl x509 -in /etc/ssl/cloudflare/assets.raptoreum.com.pem -text -noout
```

### Issue: Backend services can't connect to each other

**Solution:**
Ensure your `.env` files use `http://` for internal connections and `https://` for external URLs:

**Backend `.env`:**
```bash
# External URL (accessed through Cloudflare)
APP_URL=https://assets.raptoreum.com

# Internal URLs (direct connection, no SSL)
MONGODB_URI=mongodb://rtm_user:password@localhost:27017/rtm_explorer
REDIS_HOST=127.0.0.1
IPFS_API_URL=http://127.0.0.1:5001
```

**Frontend `.env.local`:**
```bash
# External URLs (accessed through Cloudflare)
NEXT_PUBLIC_APP_URL=https://assets.raptoreum.com
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api
```

## Verification

Once configured, verify everything is working:

```bash
# Test from external (Cloudflare edge)
curl -I https://assets.raptoreum.com

# Test API endpoint
curl https://assets.raptoreum.com/api/health

# Check SSL Labs rating (optional)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=assets.raptoreum.com

# Test from multiple locations
# Visit: https://www.websiteplanet.com/webtools/server-location/
```

## Maintenance

### Updating Cloudflare IP Ranges

Cloudflare occasionally updates their IP ranges. Check for updates periodically:

1. Visit: https://www.cloudflare.com/ips/
2. Update `/etc/nginx/conf.d/cloudflare-realip.conf`
3. Reload nginx: `sudo systemctl reload nginx`

### Certificate Renewal

Cloudflare Origin Certificates are valid for up to 15 years, so renewal is rarely needed. If you need to renew:

1. Generate a new certificate in Cloudflare dashboard
2. Replace the files in `/etc/ssl/cloudflare/`
3. Reload nginx

## Additional Resources

- [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [Cloudflare IP Ranges](https://www.cloudflare.com/ips/)
- [Cloudflare SSL/TLS Modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- [Authenticated Origin Pulls](https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/)

## Support

If you continue to experience issues:

1. Check Cloudflare support articles
2. Review nginx error logs: `sudo tail -f /var/log/nginx/rtm-explorer-error.log`
3. Review application logs: `pm2 logs`
4. Open an issue on GitHub with detailed logs and error messages
