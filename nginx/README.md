# Nginx Configuration Files

This directory contains example nginx configuration files for the Raptoreum Asset Explorer.

## Files

- **`rtm-asset-explorer.conf`** - Complete nginx configuration file with detailed comments

## Quick Setup

### 1. Copy Configuration File

```bash
# Copy the config file to nginx sites-available
sudo cp nginx/rtm-asset-explorer.conf /etc/nginx/sites-available/rtm-asset-explorer
```

### 2. Configure Rate Limiting

The configuration file includes rate limiting zones that must be placed in the nginx http block:

```bash
# Option 1: Add to main nginx.conf
sudo nano /etc/nginx/nginx.conf

# Inside the http {} block, add:
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
# limit_req_zone $binary_remote_addr zone=frontend_limit:10m rate=30r/s;

# Option 2: Create a separate file
sudo nano /etc/nginx/conf.d/rate-limits.conf

# Add the rate limiting zones:
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=frontend_limit:10m rate=30r/s;
```

After adding these to the http block, remove the `limit_req_zone` lines from the site configuration file.

### 3. Update Site Configuration

Edit the file and update these settings:

```bash
sudo nano /etc/nginx/sites-available/rtm-asset-explorer
```

**Required changes:**
- `server_name` - Your domain name
- SSL certificate paths - Based on your SSL setup (Cloudflare or Let's Encrypt)
- Upstream ports (if different from defaults):
  - `api_backend`: Port 4004 (backend API)
  - `frontend_backend`: Port 3003 (Next.js frontend)

**Optional changes:**
- Rate limits (if you need different values)
- Enable/disable Basic Authentication
- Timeouts and buffer settings

### 4. Enable Site

```bash
# Create symbolic link to sites-enabled
sudo ln -s /etc/nginx/sites-available/rtm-asset-explorer /etc/nginx/sites-enabled/

# Remove default site (if present)
sudo rm /etc/nginx/sites-enabled/default
```

### 5. Test Configuration

```bash
# Test nginx configuration
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 6. Reload Nginx

```bash
# Reload nginx to apply changes
sudo systemctl reload nginx

# Or restart if reload doesn't work
sudo systemctl restart nginx
```

## Verification

After setup, verify everything works:

```bash
# Test API endpoint
curl https://your-domain.com/api/v1/health

# Expected: {"success":true,"data":{"status":"healthy",...}}

# Test frontend
curl https://your-domain.com

# Expected: HTML page content
```

## Troubleshooting

### Configuration Test Fails

If `nginx -t` fails:
1. Check the error message for syntax errors
2. Verify all file paths exist
3. Ensure SSL certificate files are readable
4. Check for typos in directives

### 502 Bad Gateway

If you get 502 errors:
1. Verify backend services are running:
   ```bash
   netstat -tlnp | grep -E ":(3003|4004)"
   ```
2. Check backend/frontend logs for errors
3. Verify upstream server addresses are correct

### 404 Not Found for /api/v1/*

If API requests return 404:
1. Verify backend is running: `curl http://localhost:4004/api/v1/health`
2. Check that backend routes are at `/api/v1/*` (not `/api/*`)
3. Ensure you restarted backend after PR #18

### SSL Certificate Errors

If you get SSL errors:
1. Verify certificate files exist and are readable
2. Check certificate paths in config file
3. Ensure certificates are valid and not expired
4. Run: `sudo nginx -t` to see specific SSL errors

## Port Configuration

Default ports used in the configuration:

| Service | Port | Description |
|---------|------|-------------|
| Nginx HTTP | 80 | HTTP traffic (redirects to HTTPS) |
| Nginx HTTPS | 443 | HTTPS traffic |
| Backend API | 4004 | Node.js Express API server |
| Frontend | 3003 | Next.js frontend server |

**Change ports:** If your services run on different ports, update the `upstream` blocks in the config file.

## SSL Certificate Setup

### Option 1: Cloudflare Origin Certificate

If using Cloudflare as CDN/proxy:

1. Follow [CLOUDFLARE_SSL_SETUP.md](../CLOUDFLARE_SSL_SETUP.md)
2. Use the Cloudflare certificate paths in nginx config
3. Ensure the configuration uses the Cloudflare certificate lines (uncommented)

### Option 2: Let's Encrypt

If using Let's Encrypt:

1. Comment out Cloudflare certificate lines
2. Uncomment Let's Encrypt certificate lines
3. Run Certbot to obtain certificates:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Rate Limiting

Default rate limits in the configuration:

| Zone | Rate | Burst | Description |
|------|------|-------|-------------|
| api_limit | 10/s | 20 | API requests |
| frontend_limit | 30/s | 50 | Frontend requests |

**Adjust limits:** Edit the `limit_req_zone` directives at the top of the config file.

## Additional Resources

- **[NGINX_CONFIGURATION.md](../NGINX_CONFIGURATION.md)** - Comprehensive nginx configuration guide
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Full deployment guide
- **[CLOUDFLARE_SSL_SETUP.md](../CLOUDFLARE_SSL_SETUP.md)** - Cloudflare SSL setup
- **[API_V1_IMPLEMENTATION.md](../API_V1_IMPLEMENTATION.md)** - API versioning details

## Support

If you encounter issues not covered in this guide:

1. Check nginx error logs: `sudo tail -f /var/log/nginx/rtm-asset-explorer-error.log`
2. Check nginx access logs: `sudo tail -f /var/log/nginx/rtm-asset-explorer-access.log`
3. Refer to the troubleshooting section in [NGINX_CONFIGURATION.md](../NGINX_CONFIGURATION.md)
4. Open an issue on GitHub with detailed error messages
