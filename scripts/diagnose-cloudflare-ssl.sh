#!/bin/bash

# ============================================
# Cloudflare SSL Diagnostic Script
# ============================================
# This script helps diagnose issues with Cloudflare Origin SSL configuration
# Run this script when experiencing 500 errors or connectivity issues
#
# Usage:
#   sudo ./diagnose-cloudflare-ssl.sh [domain]
#
# Example:
#   sudo ./diagnose-cloudflare-ssl.sh assets.raptoreum.com
#
# If no domain is provided, defaults to assets.raptoreum.com

echo "============================================"
echo "Cloudflare SSL Diagnostic Tool"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - Modify these for your deployment
# You can also pass domain as first argument: ./diagnose-cloudflare-ssl.sh your-domain.com
DOMAIN="${1:-assets.raptoreum.com}"
NGINX_CONF="/etc/nginx/sites-available/rtm-explorer"
CLOUDFLARE_CERT_DIR="/etc/ssl/cloudflare"
LOG_DIR="/var/log/nginx"
API_HEALTH_ENDPOINT="http://localhost:4004/api/health"
FRONTEND_ENDPOINT="http://localhost:3003"  # Default Next.js port, change if different
API_PORT=4004
FRONTEND_PORT=3003

echo "Checking configuration for: $DOMAIN"
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_section() {
    echo ""
    echo "============================================"
    echo "$1"
    echo "============================================"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "This script should be run with sudo for full diagnostics"
    echo "Some checks may be skipped..."
    SUDO=""
else
    SUDO=""
fi

# 1. Check Nginx Status
print_section "1. Nginx Service Status"
if systemctl is-active --quiet nginx; then
    print_status 0 "Nginx is running"
    nginx_running=1
else
    print_status 1 "Nginx is NOT running"
    echo "  Run: sudo systemctl start nginx"
    nginx_running=0
fi

# 2. Check Nginx Configuration
print_section "2. Nginx Configuration"
if [ -f "$NGINX_CONF" ]; then
    print_status 0 "Nginx configuration file exists: $NGINX_CONF"
    
    # Check if Cloudflare certificates are referenced
    if grep -q "/etc/ssl/cloudflare/" "$NGINX_CONF" 2>/dev/null; then
        print_status 0 "Configuration references Cloudflare certificates"
    else
        print_status 1 "Configuration does NOT reference Cloudflare certificates"
        print_warning "The nginx config may still be using Let's Encrypt paths"
    fi
else
    print_status 1 "Nginx configuration file NOT found: $NGINX_CONF"
fi

# Test Nginx configuration syntax
if [ $nginx_running -eq 1 ]; then
    if nginx -t &>/dev/null; then
        print_status 0 "Nginx configuration syntax is valid"
    else
        print_status 1 "Nginx configuration has syntax errors"
        echo "  Run: sudo nginx -t"
    fi
fi

# Check for auth_basic (password protection)
if [ -f "$NGINX_CONF" ]; then
    if grep -q "auth_basic" "$NGINX_CONF" 2>/dev/null; then
        print_warning "HTTP Basic Authentication (password protection) is enabled"
        echo "  This may interfere with some Cloudflare features"
        echo "  If experiencing issues, consider application-level auth instead"
    fi
fi

# 3. Check Cloudflare Certificates
print_section "3. Cloudflare Certificate Files"

if [ -d "$CLOUDFLARE_CERT_DIR" ]; then
    print_status 0 "Cloudflare certificate directory exists"
    
    # Check for certificate file
    if [ -f "$CLOUDFLARE_CERT_DIR/$DOMAIN.pem" ]; then
        print_status 0 "Origin certificate exists: $DOMAIN.pem"
        
        # Check certificate validity
        expiry_date=$(openssl x509 -in "$CLOUDFLARE_CERT_DIR/$DOMAIN.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ $? -eq 0 ]; then
            echo "  Expiry date: $expiry_date"
            
            # Check if certificate is valid
            if openssl x509 -in "$CLOUDFLARE_CERT_DIR/$DOMAIN.pem" -noout -checkend 2592000 &>/dev/null; then
                print_status 0 "Certificate is valid (not expiring in next 30 days)"
            else
                print_status 1 "Certificate is expiring soon or expired"
            fi
        fi
        
        # Check certificate subject
        subject=$(openssl x509 -in "$CLOUDFLARE_CERT_DIR/$DOMAIN.pem" -noout -subject 2>/dev/null)
        echo "  Subject: $subject"
        
    else
        print_status 1 "Origin certificate NOT found: $DOMAIN.pem"
        print_warning "You need to generate and install a Cloudflare Origin Certificate"
    fi
    
    # Check for private key
    if [ -f "$CLOUDFLARE_CERT_DIR/$DOMAIN.key" ]; then
        print_status 0 "Private key exists: $DOMAIN.key"
        
        # Check permissions
        key_perms=$(stat -c %a "$CLOUDFLARE_CERT_DIR/$DOMAIN.key" 2>/dev/null)
        if [ "$key_perms" = "600" ]; then
            print_status 0 "Private key has correct permissions (600)"
        else
            print_status 1 "Private key permissions are $key_perms (should be 600)"
            echo "  Run: sudo chmod 600 $CLOUDFLARE_CERT_DIR/$DOMAIN.key"
        fi
    else
        print_status 1 "Private key NOT found: $DOMAIN.key"
    fi
    
    # Check for Cloudflare Origin CA root certificate
    if [ -f "$CLOUDFLARE_CERT_DIR/origin_ca_rsa_root.pem" ]; then
        print_status 0 "Cloudflare Origin CA root certificate exists"
    else
        print_status 1 "Cloudflare Origin CA root certificate NOT found"
        echo "  Download from: https://developers.cloudflare.com/ssl/static/origin_ca_rsa_root.pem"
    fi
    
else
    print_status 1 "Cloudflare certificate directory NOT found: $CLOUDFLARE_CERT_DIR"
    echo "  Run: sudo mkdir -p $CLOUDFLARE_CERT_DIR"
fi

# 4. Check Port Listening
print_section "4. Port Listening Status"

if netstat -tlnp 2>/dev/null | grep -q ':443'; then
    print_status 0 "Port 443 (HTTPS) is listening"
    listening_process=$(netstat -tlnp 2>/dev/null | grep ':443' | awk '{print $7}')
    echo "  Process: $listening_process"
else
    print_status 1 "Port 443 (HTTPS) is NOT listening"
fi

if netstat -tlnp 2>/dev/null | grep -q ':80'; then
    print_status 0 "Port 80 (HTTP) is listening"
else
    print_warning "Port 80 (HTTP) is NOT listening (might be OK with Cloudflare)"
fi

# 5. Check Backend Services
print_section "5. Backend Services Status"

# Check if PM2 is available
if command -v pm2 &>/dev/null; then
    print_status 0 "PM2 is installed"
    
    # Check backend API
    if pm2 status 2>/dev/null | grep -q "api.*online"; then
        print_status 0 "Backend API is running (pm2)"
    else
        print_status 1 "Backend API is NOT running"
        echo "  Check: pm2 status"
    fi
    
    # Check frontend
    if pm2 status 2>/dev/null | grep -q "frontend.*online"; then
        print_status 0 "Frontend is running (pm2)"
    else
        print_status 1 "Frontend is NOT running"
        echo "  Check: pm2 status"
    fi
else
    print_warning "PM2 is not installed or not in PATH"
fi

# Test backend API directly
if curl -s -o /dev/null -w "%{http_code}" "$API_HEALTH_ENDPOINT" 2>/dev/null | grep -q "200"; then
    print_status 0 "Backend API responds on $API_HEALTH_ENDPOINT"
else
    print_status 1 "Backend API does NOT respond on $API_HEALTH_ENDPOINT"
fi

# Test frontend directly
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_ENDPOINT" 2>/dev/null | grep -q "200"; then
    print_status 0 "Frontend responds on $FRONTEND_ENDPOINT"
else
    print_status 1 "Frontend does NOT respond on $FRONTEND_ENDPOINT"
fi

# Check specific ports
echo ""
echo "Checking if services are listening on expected ports:"
if netstat -tlnp 2>/dev/null | grep -q ":$API_PORT "; then
    print_status 0 "API port $API_PORT is listening"
else
    print_status 1 "API port $API_PORT is NOT listening"
fi

if netstat -tlnp 2>/dev/null | grep -q ":$FRONTEND_PORT "; then
    print_status 0 "Frontend port $FRONTEND_PORT is listening"
else
    print_status 1 "Frontend port $FRONTEND_PORT is NOT listening"
    print_warning "Check if frontend is configured to use port $FRONTEND_PORT in .env file"
fi

# 6. Check DNS and Cloudflare
print_section "6. DNS and Cloudflare Status"

# Check DNS resolution
if host "$DOMAIN" &>/dev/null; then
    print_status 0 "Domain resolves: $DOMAIN"
    ip=$(host "$DOMAIN" | grep "has address" | awk '{print $4}' | head -1)
    echo "  Resolved IP: $ip"
    
    # Check if IP is Cloudflare
    if echo "$ip" | grep -qE "^(173\.245\.|103\.21\.|103\.22\.|103\.31\.|141\.101\.|108\.162\.|190\.93\.|188\.114\.|197\.234\.|198\.41\.|162\.158\.|104\.1[6-9]\.|104\.2[0-7]\.|172\.6[4-9]\.|172\.7[0-1]\.)"; then
        print_status 0 "Domain is proxied through Cloudflare"
    else
        print_warning "Domain does NOT appear to be proxied through Cloudflare"
        echo "  Check Cloudflare DNS settings - ensure orange cloud is enabled"
    fi
else
    print_status 1 "Domain does NOT resolve: $DOMAIN"
fi

# 7. Check Cloudflare Real IP Configuration
print_section "7. Cloudflare Real IP Configuration"

realip_conf="/etc/nginx/conf.d/cloudflare-realip.conf"
if [ -f "$realip_conf" ]; then
    print_status 0 "Cloudflare Real IP configuration exists"
    
    # Check if it contains set_real_ip_from directives
    if grep -q "set_real_ip_from" "$realip_conf"; then
        print_status 0 "Real IP configuration has set_real_ip_from directives"
    else
        print_status 1 "Real IP configuration missing set_real_ip_from directives"
    fi
    
    # Check if it has CF-Connecting-IP header
    if grep -q "CF-Connecting-IP" "$realip_conf"; then
        print_status 0 "Configuration uses CF-Connecting-IP header"
    else
        print_status 1 "Configuration does NOT use CF-Connecting-IP header"
    fi
else
    print_status 1 "Cloudflare Real IP configuration NOT found: $realip_conf"
    print_warning "Create this file to get real visitor IPs from Cloudflare"
fi

# 8. Check Recent Logs
print_section "8. Recent Nginx Logs"

if [ -f "$LOG_DIR/rtm-explorer-error.log" ]; then
    error_count=$(wc -l < "$LOG_DIR/rtm-explorer-error.log" 2>/dev/null || echo "0")
    echo "Error log has $error_count lines"
    
    if [ "$error_count" -gt 0 ]; then
        echo ""
        echo "Last 5 errors:"
        tail -n 5 "$LOG_DIR/rtm-explorer-error.log" 2>/dev/null || echo "  Cannot read error log"
    fi
else
    print_warning "Error log not found: $LOG_DIR/rtm-explorer-error.log"
fi

if [ -f "$LOG_DIR/rtm-explorer-access.log" ]; then
    access_count=$(wc -l < "$LOG_DIR/rtm-explorer-access.log" 2>/dev/null || echo "0")
    echo ""
    echo "Access log has $access_count lines"
    
    if [ "$access_count" -gt 0 ]; then
        echo ""
        echo "Last 3 access entries:"
        tail -n 3 "$LOG_DIR/rtm-explorer-access.log" 2>/dev/null || echo "  Cannot read access log"
    fi
else
    print_warning "Access log not found: $LOG_DIR/rtm-explorer-access.log"
fi

# 9. Test SSL Connection
print_section "9. SSL Connection Test"

echo "Testing SSL connection to $DOMAIN..."
if timeout 5 openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    print_status 0 "SSL connection successful"
else
    print_status 1 "SSL connection failed or verification issue"
    echo "  This might be expected if testing from the server itself"
fi

# 10. Firewall Check
print_section "10. Firewall Status"

if command -v ufw &>/dev/null; then
    if ufw status 2>/dev/null | grep -q "Status: active"; then
        print_status 0 "UFW firewall is active"
        
        # Check if ports are allowed
        if ufw status 2>/dev/null | grep -q "443"; then
            print_status 0 "Port 443 is allowed in firewall"
        else
            print_warning "Port 443 might not be explicitly allowed in firewall"
        fi
        
        if ufw status 2>/dev/null | grep -q "80"; then
            print_status 0 "Port 80 is allowed in firewall"
        else
            print_warning "Port 80 might not be explicitly allowed in firewall"
        fi
    else
        print_warning "UFW firewall is not active"
    fi
else
    print_warning "UFW not installed"
fi

# Summary and Recommendations
print_section "Summary and Next Steps"

echo ""
echo "Common issues and solutions:"
echo ""
echo "1. If you get 500 errors with NO nginx logs:"
echo "   → Cloudflare is returning the error before reaching your server"
echo "   → Check Cloudflare SSL/TLS mode (should be 'Full (strict)')"
echo "   → Ensure origin certificate is properly installed"
echo ""
echo "2. If backend services aren't running:"
echo "   → Run: pm2 start ecosystem.config.js"
echo "   → Check logs: pm2 logs"
echo ""
echo "3. If nginx configuration has errors:"
echo "   → Test config: sudo nginx -t"
echo "   → Check certificate paths in nginx config"
echo ""
echo "4. If SSL certificate issues:"
echo "   → Regenerate Cloudflare Origin Certificate"
echo "   → Reinstall certificate files"
echo "   → Check file permissions (cert: 644, key: 600)"
echo ""
echo "For detailed setup instructions, see: CLOUDFLARE_SSL_SETUP.md"
echo ""

print_section "Diagnostic Complete"
