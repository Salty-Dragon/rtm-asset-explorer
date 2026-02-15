# Troubleshooting: 500 Error with No Nginx Logs (Password Protected Site)

## Your Configuration

Based on your nginx configuration:
- ✅ Cloudflare Origin SSL properly configured
- ✅ Password protection enabled (`auth_basic`)
- ✅ Frontend: port **3003**
- ✅ Backend API: port **4004**
- ❌ 500 error with **NO nginx logs**

## Critical Issue Identified

**If there are NO logs in nginx at all**, the request is not reaching your nginx server. This means the problem is **before** nginx, likely at the Cloudflare level or with your backend services.

## Diagnostic Steps

Run these commands on your server to diagnose the actual issue:

### Step 1: Check if Nginx is Running and Listening

```bash
# Check nginx status
sudo systemctl status nginx

# Check if nginx is listening on ports 80 and 443
sudo netstat -tlnp | grep nginx
# You should see:
# tcp  0  0  0.0.0.0:80    0.0.0.0:*  LISTEN  <pid>/nginx
# tcp  0  0  0.0.0.0:443   0.0.0.0:*  LISTEN  <pid>/nginx
```

**If nginx is NOT listening on port 443**, that's your problem. Fix:
```bash
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

### Step 2: Check if Backend Services are Running

```bash
# Check PM2 status
pm2 status

# Check if API is running on port 4004
curl http://localhost:4004/api/health

# Check if frontend is running on port 3003
curl http://localhost:3003

# If services are not running:
pm2 start ecosystem.config.js
pm2 save
```

### Step 3: Test Nginx Directly (Bypass Cloudflare)

```bash
# Get your server's actual IP address
curl -4 ifconfig.me

# From your local machine, test direct access using server IP:
curl -I -k --user username:password https://YOUR_SERVER_IP
# Replace YOUR_SERVER_IP with actual IP
# Replace username:password with your auth_basic credentials

# This should:
# - Return 401 if password is wrong (nginx is working)
# - Return 200 or 30x if password is correct (nginx is working)
# - Timeout or connection refused if nginx isn't running
```

### Step 4: Check Cloudflare Settings

The issue might be with Cloudflare configuration:

1. **Check SSL/TLS Mode**:
   - Go to Cloudflare Dashboard → SSL/TLS → Overview
   - Ensure it's set to **"Full (strict)"**
   - If it's "Flexible" or "Off", change it to "Full (strict)"

2. **Check Proxy Status**:
   - Go to Cloudflare Dashboard → DNS
   - Verify the A record for `assets.raptoreum.com`
   - Ensure the **orange cloud is enabled** (proxied)

3. **Check Cloudflare Error Logs**:
   - In Cloudflare Dashboard, go to Analytics → Traffic
   - Look for 521 errors (Web Server Is Down)
   - Look for 525 errors (SSL Handshake Failed)

### Step 5: Check Nginx Logs Directory

```bash
# Verify log directory exists and is writable
ls -la /var/log/nginx/

# Check if log files exist
ls -la /var/log/nginx/rtm-asset-explorer-*

# Try to manually write to the log directory
sudo touch /var/log/nginx/test.log
sudo rm /var/log/nginx/test.log

# Check nginx error log for ANY errors
sudo tail -100 /var/log/nginx/error.log

# Check system logs for nginx errors
sudo journalctl -u nginx -n 50
```

### Step 6: Test Auth Basic with Cloudflare

There's a known issue with HTTP Basic Auth and Cloudflare. Test this:

```bash
# Temporarily disable auth_basic to test
sudo nano /etc/nginx/sites-available/rtm-explorer

# Comment out these lines:
# auth_basic "Restricted";
# auth_basic_user_file /etc/nginx/.htpasswd;

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Now test accessing the site through Cloudflare
# If it works now, the issue is with auth_basic + Cloudflare
```

## Common Causes and Solutions

### Cause 1: Backend Services Not Running

**Symptoms**: No nginx logs, 500 error
**Check**:
```bash
pm2 status
curl http://localhost:4004/api/health
curl http://localhost:3003
```

**Solution**:
```bash
cd /opt/rtm-explorer/backend
pm2 start ecosystem.config.js
pm2 save
pm2 status  # Verify they're running
```

### Cause 2: Frontend on Wrong Port

Your nginx expects frontend on **port 3003**, but the default is 3000.

**Check**:
```bash
# Check what's running on port 3003
sudo netstat -tlnp | grep 3003
```

**Solution**: Update frontend .env file:
```bash
cd /opt/rtm-explorer/frontend
nano .env.local

# Ensure it has:
PORT=3003

# Then restart:
pm2 restart rtm-frontend
```

### Cause 3: Cloudflare SSL Mode is Wrong

**Symptoms**: 500 error, Cloudflare shows "Error 521" or "Error 525"

**Solution**:
1. Go to Cloudflare Dashboard
2. SSL/TLS → Overview
3. Set to **"Full (strict)"**
4. Wait 1-2 minutes for propagation

### Cause 4: Nginx Not Running

**Symptoms**: Connection refused, 521 errors

**Check**:
```bash
sudo systemctl status nginx
```

**Solution**:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Cause 5: Auth Basic Blocking Cloudflare

HTTP Basic Auth can interfere with Cloudflare's proxying. 

**Solution**: Either:

**Option A**: Remove auth_basic (recommended for production)
- Use application-level authentication instead
- Or use Cloudflare Access for protection

**Option B**: Configure Cloudflare to pass auth headers
- Ensure Cloudflare isn't stripping auth headers
- May need to configure Page Rules

**Option C**: Gray cloud the DNS (not recommended)
- Disables Cloudflare proxy
- Direct connection to your server

## Debugging Script

I've updated the diagnostic script. Run it with:

```bash
cd /opt/rtm-explorer
chmod +x scripts/diagnose-cloudflare-ssl.sh
sudo ./scripts/diagnose-cloudflare-ssl.sh assets.raptoreum.com
```

## Expected Results

After fixing the issue:

1. **Nginx logs should appear**: Requests logged in `/var/log/nginx/rtm-asset-explorer-access.log`
2. **Backend services running**: `pm2 status` shows both API and frontend as "online"
3. **Frontend on port 3003**: `curl http://localhost:3003` returns HTML
4. **API on port 4004**: `curl http://localhost:4004/api/health` returns JSON
5. **Site accessible**: https://assets.raptoreum.com works (with or without auth)

## Most Likely Issue

Based on "500 error with NO nginx logs", the most likely causes are (in order):

1. **Backend services not running** (port 3003 and/or 4004)
2. **Cloudflare SSL mode is not "Full (strict)"**
3. **Nginx not actually listening on port 443**
4. **Firewall blocking Cloudflare IPs**

## Next Steps

1. Run the diagnostic commands above
2. Share the output of:
   - `pm2 status`
   - `sudo netstat -tlnp | grep nginx`
   - `curl http://localhost:3003`
   - `curl http://localhost:4004/api/health`
   - Your Cloudflare SSL/TLS mode setting

This will help identify the exact issue.
