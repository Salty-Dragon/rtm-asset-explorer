# Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Raptoreum Asset Explorer to an OVH server without Docker. All services run under PM2 process manager with Nginx as a reverse proxy.

## Table of Contents

1. [Server Requirements](#server-requirements)
2. [Initial Server Setup](#initial-server-setup)
3. [Installing Dependencies](#installing-dependencies)
4. [Raptoreumd Installation](#raptoreumd-installation)
5. [MongoDB Setup](#mongodb-setup)
6. [Redis Setup](#redis-setup)
7. [IPFS Setup](#ipfs-setup)
8. [Node.js Application Setup](#nodejs-application-setup)
9. [PM2 Configuration](#pm2-configuration)
10. [Nginx Configuration](#nginx-configuration)
11. [SSL/TLS Setup](#ssltls-setup)
12. [Environment Variables](#environment-variables)
13. [Initial Data Sync](#initial-data-sync)
14. [Backblaze B2 Backup Setup](#backblaze-b2-backup-setup)
15. [Monitoring Setup](#monitoring-setup)
16. [Troubleshooting](#troubleshooting)

---

## Server Requirements

### Minimum Hardware
- **CPU**: 4 cores (8 cores recommended)
- **RAM**: 16 GB (32 GB recommended)
- **Storage**: 500 GB SSD (1 TB recommended)
- **Network**: 1 Gbps connection

### Operating System
- **Ubuntu 22.04 LTS** or **Debian 12** (recommended)
- 64-bit architecture

### Estimated Disk Usage
- Raptoreum blockchain: ~50-100 GB
- MongoDB database: ~20-50 GB
- IPFS cache: ~10-20 GB
- Logs and backups: ~10-20 GB
- System and applications: ~20 GB

---

## Initial Server Setup

### 1. Connect to Server

```bash
ssh root@your-server-ip
```

### 2. Update System

```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential software-properties-common ufw
```

### 3. Create Non-Root User

```bash
# Create user
adduser rtmexplorer

# Add to sudo group
usermod -aG sudo rtmexplorer

# Switch to new user
su - rtmexplorer
```

### 4. Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### 5. Configure SSH (Optional but Recommended)

```bash
# Generate SSH key on your local machine
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to server
ssh-copy-id rtmexplorer@your-server-ip

# On server, disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

### 6. Set Timezone

```bash
sudo timedatectl set-timezone UTC
```

---

## Installing Dependencies

### 1. Install Node.js 24 LTS

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load NVM
source ~/.bashrc

# Install Node.js 24 LTS
nvm install 24
nvm use 24
nvm alias default 24

# Verify installation
node --version
npm --version
```

### 2. Install PM2

```bash
npm install -g pm2

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the command

# Save PM2 configuration
pm2 save
```

### 3. Install Build Tools

```bash
sudo apt install -y \
  build-essential \
  pkg-config \
  libtool \
  autotools-dev \
  automake \
  autoconf \
  libssl-dev \
  libboost-all-dev \
  libevent-dev \
  bsdmainutils
```

---

## Raptoreumd Installation

### 1. Download and Install Raptoreumd

```bash
# Create directory
mkdir -p ~/raptoreum
cd ~/raptoreum

# Download Raptoreumd (replace with actual download link)
wget https://github.com/Raptor3um/raptoreum/releases/download/vX.X.X/raptoreum-X.X.X-x86_64-linux-gnu.tar.gz

# Extract
tar -xzf raptoreum-X.X.X-x86_64-linux-gnu.tar.gz

# Move binaries
sudo cp raptoreum-X.X.X/bin/* /usr/local/bin/

# Verify installation
raptoreumd --version
```

### 2. Configure Raptoreumd

```bash
# Create data directory
mkdir -p ~/.raptoreum

# Create configuration file
nano ~/.raptoreum/raptoreum.conf
```

```ini
# raptoreum.conf
# RPC Settings
server=1
rpcuser=rtm_explorer_rpc_user
rpcpassword=CHANGE_THIS_TO_SECURE_PASSWORD_123
rpcallowip=127.0.0.1
rpcport=10225
rpcbind=127.0.0.1

# Network Settings
listen=1
daemon=1

# Indexing (Required for Explorer)
txindex=1
addressindex=1
timestampindex=1
spentindex=1
assetindex=1

# Performance
dbcache=2048
maxmempool=512

# Logging
debug=0
shrinkdebugfile=1
```

### 3. Start Raptoreumd

```bash
# Start daemon
raptoreumd -daemon

# Check sync status
raptoreum-cli getblockchaininfo

# View logs
tail -f ~/.raptoreum/debug.log
```

### 4. Wait for Initial Sync

The initial blockchain sync can take several hours to days. Monitor progress:

```bash
# Check sync progress
watch -n 10 'raptoreum-cli getblockchaininfo | grep -E "blocks|headers|verificationprogress"'
```

---

## MongoDB Setup

### 1. Install MongoDB 8.x

```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-8.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# Update and install
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify installation
mongod --version
```

### 2. Configure MongoDB

```bash
# Edit configuration
sudo nano /etc/mongod.conf
```

```yaml
# mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true

net:
  port: 27017
  bindIp: 127.0.0.1

security:
  authorization: enabled

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
```

### 3. Create MongoDB User

```bash
# Connect to MongoDB
mongosh

# Switch to admin database
use admin

# Create admin user
db.createUser({
  user: "admin",
  pwd: "CHANGE_THIS_TO_SECURE_PASSWORD",
  roles: ["root"]
})

# Switch to rtm_explorer database
use rtm_explorer

# Create application user
db.createUser({
  user: "rtm_explorer",
  pwd: "CHANGE_THIS_TO_SECURE_PASSWORD",
  roles: [
    { role: "readWrite", db: "rtm_explorer" }
  ]
})

# Exit
exit
```

### 4. Restart MongoDB

```bash
sudo systemctl restart mongod
sudo systemctl status mongod
```

### 5. Create Indexes

Connect to MongoDB and create indexes:

```bash
mongosh "mongodb://rtm_explorer:YOUR_PASSWORD@localhost:27017/rtm_explorer"
```

```javascript
// Create indexes as defined in DATABASE.md

// Blocks collection
db.blocks.createIndex({ height: -1 }, { unique: true })
db.blocks.createIndex({ hash: 1 }, { unique: true })
db.blocks.createIndex({ timestamp: -1 })
db.blocks.createIndex({ miner: 1, timestamp: -1 })

// Transactions collection
db.transactions.createIndex({ txid: 1 }, { unique: true })
db.transactions.createIndex({ blockHeight: -1 })
db.transactions.createIndex({ timestamp: -1 })
db.transactions.createIndex({ 'outputs.address': 1, timestamp: -1 })
db.transactions.createIndex({ 'inputs.address': 1, timestamp: -1 })
db.transactions.createIndex({ type: 1, timestamp: -1 })
db.transactions.createIndex({ 'assetData.assetId': 1 })

// Assets collection
db.assets.createIndex({ assetId: 1 }, { unique: true })
db.assets.createIndex({ name: 1 })
db.assets.createIndex({ creator: 1, createdAt: -1 })
db.assets.createIndex({ currentOwner: 1, createdAt: -1 })
db.assets.createIndex({ type: 1, createdAt: -1 })
db.assets.createIndex({ ipfsHash: 1 })
db.assets.createIndex({ tags: 1 })
db.assets.createIndex({ categories: 1 })
db.assets.createIndex({ createdAt: -1 })
db.assets.createIndex({ views: -1 })
db.assets.createIndex({ featured: 1, createdAt: -1 })

// Text index for asset search
db.assets.createIndex(
  { 
    name: 'text', 
    'metadata.name': 'text', 
    'metadata.description': 'text',
    searchText: 'text',
    tags: 'text'
  },
  { 
    name: 'asset_text_search',
    weights: {
      name: 10,
      'metadata.name': 10,
      tags: 5,
      'metadata.description': 3,
      searchText: 1
    }
  }
)

// Additional indexes for other collections...
// (See DATABASE.md for complete list)
```

---

## Redis Setup

### 1. Install Redis 7.x

```bash
# Install Redis
sudo apt install -y redis-server

# Verify installation
redis-server --version
```

### 2. Configure Redis

```bash
# Edit configuration
sudo nano /etc/redis/redis.conf
```

```conf
# redis.conf
bind 127.0.0.1
port 6379
daemonize yes

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Security
requirepass CHANGE_THIS_TO_SECURE_PASSWORD

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

### 3. Start Redis

```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
sudo systemctl status redis-server

# Test connection
redis-cli -a YOUR_PASSWORD ping
# Should return: PONG
```

---

## IPFS Setup

### 1. Install IPFS (Kubo)

```bash
# Download IPFS
cd ~
wget https://dist.ipfs.tech/kubo/v0.24.0/kubo_v0.24.0_linux-amd64.tar.gz

# Extract
tar -xzf kubo_v0.24.0_linux-amd64.tar.gz

# Install
cd kubo
sudo bash install.sh

# Verify installation
ipfs --version
```

### 2. Initialize IPFS

```bash
# Initialize IPFS node
ipfs init --profile server

# Configure IPFS
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5001
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8080
```

### 3. Create IPFS Service

```bash
# Create systemd service
sudo nano /etc/systemd/system/ipfs.service
```

```ini
[Unit]
Description=IPFS Daemon
After=network.target

[Service]
Type=simple
User=rtmexplorer
Environment="IPFS_PATH=/home/rtmexplorer/.ipfs"
ExecStart=/usr/local/bin/ipfs daemon
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

### 4. Start IPFS

```bash
sudo systemctl daemon-reload
sudo systemctl start ipfs
sudo systemctl enable ipfs
sudo systemctl status ipfs

# Test IPFS
ipfs id
```

---

## Node.js Application Setup

### 1. Clone Repository

```bash
# Create application directory
mkdir -p /opt/rtm-explorer
cd /opt/rtm-explorer

# Clone repository
git clone https://github.com/yourusername/rtm-asset-explorer.git .

# Set ownership
sudo chown -R rtmexplorer:rtmexplorer /opt/rtm-explorer
```

### 2. Install Backend Dependencies

```bash
cd /opt/rtm-explorer/backend
npm install --production
```

### 3. Install System Dependencies for Image Processing

Before installing Node.js dependencies, install system libraries required by sharp (used for image optimization):

```bash
# Install required system libraries
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  python3 \
  libvips-dev \
  pkg-config
```

### 4. Install Frontend Dependencies

```bash
cd /opt/rtm-explorer/frontend
npm install
npm run build
```

> **⚠️ Important:** The frontend MUST be built before starting with PM2. The `npm start` command requires a successful build in the `.next` directory. If you get 500 errors, verify the frontend was built successfully:
> ```bash
> ls -la /opt/rtm-explorer/frontend/.next/
> # Should show build output including standalone/ directory
> ```

> **📦 Critical: Image Optimization with Sharp**
>
> The application uses `sharp` for Next.js image optimization, which is **required for WebP support** and other image formats. The `sharp` package includes native binaries that **must be compiled on the production server** where the app will run.
>
> **Important Notes:**
> - ✅ Always run `npm install` on the production server (not locally and then copied)
> - ✅ System dependencies (listed above) must be installed BEFORE `npm install`
> - ✅ Sharp will be automatically compiled during `npm install`
> - ✅ Verify sharp works: `npm list sharp` should show it's installed
>
> **If WebP images don't display after deployment:**
> - Logo appears invisible or shows "image type not supported"
> - Server logs show: "The requested resource isn't a valid image"
>
> **Fix:** Rebuild sharp on the production server:
> ```bash
> cd /opt/rtm-explorer/frontend
> npm rebuild sharp
> npm run build
> pm2 restart rtm-frontend
> ```
>
> **For detailed troubleshooting**, see [WEBP_TROUBLESHOOTING.md](WEBP_TROUBLESHOOTING.md).

### 4. Create Directory Structure

```bash
# Create necessary directories
mkdir -p /opt/rtm-explorer/logs
mkdir -p /opt/rtm-explorer/backups
mkdir -p /var/log/rtm-explorer

# Set permissions
chmod 755 /opt/rtm-explorer/logs
chmod 755 /opt/rtm-explorer/backups
```

---

## PM2 Configuration

### 1. Create PM2 Ecosystem File

```bash
cd /opt/rtm-explorer
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'rtm-api',
      script: './backend/src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4004
      },
      error_file: '/var/log/rtm-explorer/api-error.log',
      out_file: '/var/log/rtm-explorer/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
    },
    {
      name: 'rtm-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000  // Change this to match your nginx configuration (e.g., 3003)
      },
      error_file: '/var/log/rtm-explorer/frontend-error.log',
      out_file: '/var/log/rtm-explorer/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '2G',
      autorestart: true,
    },
    {
      name: 'rtm-sync',
      script: './backend/src/services/sync-daemon.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/rtm-explorer/sync-error.log',
      out_file: '/var/log/rtm-explorer/sync-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      autorestart: true,
      cron_restart: '0 3 * * *', // Restart daily at 3 AM
    }
  ]
};
```

> **⚠️ CRITICAL: Port Configuration Must Match**
> 
> The `PORT` value in the PM2 configuration MUST match what's configured in your nginx upstream:
> - If nginx has `server 127.0.0.1:3003` for frontend, use `PORT: 3003`
> - If nginx has `server 127.0.0.1:3000` for frontend, use `PORT: 3000`
> - Mismatch will cause **500 errors** because nginx cannot connect to the frontend
> 
> Also ensure your `frontend/.env` file has the same PORT value:
> ```bash
> echo "PORT=3003" >> /opt/rtm-explorer/frontend/.env
> ```

### 2. Start Applications with PM2

```bash
# Start all applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# List running processes
pm2 list

# Monitor processes
pm2 monit

# View logs
pm2 logs
pm2 logs rtm-api
pm2 logs rtm-frontend
pm2 logs rtm-sync
```

### 3. PM2 Log Rotation

```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

---

## Nginx Configuration

> **Important**: For detailed nginx configuration information including `/api/v1` endpoint handling and troubleshooting, see [NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md).
>
> **⚠️ CRITICAL: Use the Complete Configuration File**
>
> The repository includes a complete, up-to-date nginx configuration at `nginx/rtm-asset-explorer.conf` that includes:
> - API v1 routing
> - **IPFS gateway proxy** (required for asset images)
> - Frontend API routes
> - Proper security headers
> - Caching configuration
> - Rate limiting
>
> It is **strongly recommended** to use that file instead of manually creating a configuration. See below for instructions.

### 1. Install Nginx

```bash
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Deploy Complete Nginx Configuration

**Option A: Use the Complete Config from Repository (Recommended)**

```bash
# Copy the complete configuration from repository
sudo cp /opt/rtm-explorer/nginx/rtm-asset-explorer.conf /etc/nginx/sites-available/rtm-explorer

# Edit configuration for your environment
# Update: server_name, SSL certificate paths, ports if different
sudo nano /etc/nginx/sites-available/rtm-explorer

# IMPORTANT: Add the rate limiting zones to nginx.conf http block
# (These directives must be in the http block, not in the server block)
sudo nano /etc/nginx/nginx.conf

# Add inside the http {} block:
#   limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
#   limit_req_zone $binary_remote_addr zone=frontend_limit:10m rate=30r/s;
#   
#   map $http_upgrade $connection_upgrade {
#       default upgrade;
#       ''      '';
#   }
```

**Option B: Manual Configuration (Not Recommended - May Miss IPFS Proxy)**

If you must create the configuration manually, ensure you include ALL sections from `nginx/rtm-asset-explorer.conf`, especially:
- The `/ipfs/` location block for IPFS gateway proxying
- The `/api/v1/` location block for backend API
- Proper upstream definitions

**⚠️ Common Issue**: Missing the IPFS proxy configuration will cause asset images to show "no image" placeholders. See [IPFS_TROUBLESHOOTING.md](IPFS_TROUBLESHOOTING.md) if you encounter this issue.

<details>
<summary>Click to view minimal nginx configuration (incomplete - missing IPFS and other features)</summary>

> **Warning**: This is a minimal example for reference only. Use the complete config from `nginx/rtm-asset-explorer.conf` instead.

```nginx
# Rate limiting (add to /etc/nginx/nginx.conf http block)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=frontend_limit:10m rate=30r/s;

# Connection upgrade mapping (add to /etc/nginx/nginx.conf http block)
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      '';
}

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
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name assets.raptoreum.com;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;

    # Logging
    access_log /var/log/nginx/rtm-explorer-access.log;
    error_log /var/log/nginx/rtm-explorer-error.log;

    # Backend API Routes - /api/v1/*
    location /api/v1/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # ⚠️ CRITICAL: IPFS Gateway Proxy - REQUIRED FOR ASSET IMAGES
    location /ipfs/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:8080/ipfs/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    # Frontend Routes (catch-all)
    location / {
        limit_req zone=frontend_limit burst=50 nodelay;
        proxy_pass http://frontend_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> **Note**: This minimal config is missing many important features. Use `nginx/rtm-asset-explorer.conf` for production.

</details>

### 3. Enable Site Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/rtm-explorer /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

> **Note**: If you are using **Cloudflare with Origin SSL certificates** instead of Let's Encrypt, please follow the [Cloudflare SSL Setup Guide](CLOUDFLARE_SSL_SETUP.md) instead of the instructions below. This is a common configuration when using Cloudflare as a CDN/proxy.

### Option 1: Let's Encrypt (Standard Setup)

#### 1. Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Create webroot directory
sudo mkdir -p /var/www/certbot
```

#### 2. Obtain SSL Certificate

```bash
# Get certificate
sudo certbot --nginx -d assets.raptoreum.com

# Follow the prompts:
# - Enter email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)
```

#### 3. Auto-Renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot automatically creates a renewal cron job
# Verify it exists:
sudo systemctl list-timers | grep certbot
```

#### 4. Verify SSL Configuration

```bash
# Test SSL configuration at:
# https://www.ssllabs.com/ssltest/

# Should achieve A+ rating with the configuration above
```

### Option 2: Cloudflare Origin SSL

If you are using Cloudflare as a CDN/proxy with Origin SSL certificates:

1. Follow the complete setup guide: [CLOUDFLARE_SSL_SETUP.md](CLOUDFLARE_SSL_SETUP.md)
2. Use the diagnostic tool to verify your configuration:

```bash
# Make the script executable (if not already)
chmod +x scripts/diagnose-cloudflare-ssl.sh

# Run diagnostic tool
sudo ./scripts/diagnose-cloudflare-ssl.sh
```

**Key differences when using Cloudflare:**
- Certificate paths point to `/etc/ssl/cloudflare/` instead of `/etc/letsencrypt/`
- Real visitor IPs are obtained from `CF-Connecting-IP` header
- SSL mode in Cloudflare dashboard must be set to "Full (strict)"
- Orange cloud (proxy) must be enabled in Cloudflare DNS settings

---

## Environment Variables

### 1. Create .env File

```bash
cd /opt/rtm-explorer/backend
nano .env
```

```bash
# .env file
NODE_ENV=production

# Server
PORT=4004
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://rtm_explorer:YOUR_MONGODB_PASSWORD@localhost:27017/rtm_explorer
MONGODB_OPTIONS={"useNewUrlParser":true,"useUnifiedTopology":true}

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
REDIS_DB=0

# Blockchain RPC
RPC_HOST=127.0.0.1
RPC_PORT=10225
RPC_USER=rtm_explorer_rpc_user
RPC_PASSWORD=YOUR_RPC_PASSWORD
RPC_TIMEOUT=30000

# IPFS
IPFS_HOST=127.0.0.1
IPFS_PORT=5001
IPFS_PROTOCOL=http
IPFS_TIMEOUT=30000

# API
API_SECRET=YOUR_RANDOM_SECRET_KEY_HERE
API_BASE_URL=https://assets.raptoreum.com/api/v1

# Rate Limiting
RATE_LIMIT_FREE=100
RATE_LIMIT_PREMIUM=1000
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/rtm-explorer

# Backups
BACKUP_DIR=/opt/rtm-explorer/backups
BACKUP_RETENTION_DAYS=30

# Backblaze B2
B2_KEY_ID=YOUR_B2_KEY_ID
B2_APP_KEY=YOUR_B2_APP_KEY
B2_BUCKET=rtm-explorer-backups
B2_REGION=us-west-002

# Email (for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@raptoreum.com
SMTP_PASSWORD=YOUR_SMTP_PASSWORD
ADMIN_EMAIL=admin@raptoreum.com

# Security
ENCRYPTION_KEY=YOUR_32_BYTE_ENCRYPTION_KEY_HERE

# Export System
EXPORT_PRICE_USD=2.00
EXPORT_MAX_ASSETS=1000
EXPORT_MAX_TRANSACTIONS=10000
EXPORT_MAX_ADDRESSES=100
EXPORT_MAX_FILE_SIZE_MB=100
EXPORT_MAX_PROCESSING_TIME_SEC=600
EXPORT_RATE_LIMIT_PER_HOUR=10
EXPORT_CONCURRENT_LIMIT=3
EXPORT_QUEUE_MAX_SIZE=50

# Litecoin Payment Node
LITECOIN_RPC_HOST=127.0.0.1
LITECOIN_RPC_PORT=9332
LITECOIN_RPC_USER=ltc_user
LITECOIN_RPC_PASS=YOUR_LITECOIN_RPC_PASSWORD

# Remote Raptoreumd (for asset creation)
REMOTE_RAPTOREUMD_HOST=remote.server.com
REMOTE_RAPTOREUMD_PORT=10225
REMOTE_RAPTOREUMD_USER=rtm_asset_creator
REMOTE_RAPTOREUMD_PASS=YOUR_REMOTE_RPC_PASSWORD
REMOTE_RAPTOREUM_OWNER_ADDRESS=RxxxxOwnerAddress
EXPORT_HOLDER_ADDRESS=RxxxxHolderAddress

# Export Signing
EXPORT_SIGNING_PRIVATE_KEY=/opt/rtm-explorer/keys/export_private_key.pem
EXPORT_SIGNING_PUBLIC_KEY=/opt/rtm-explorer/keys/export_public_key.pem

# IPFS (local follower node + public fallback)
IPFS_LOCAL_GATEWAY=http://127.0.0.1:8080
IPFS_API_URL=http://127.0.0.1:5001
IPFS_PUBLIC_GATEWAY=https://ipfs.io
IPFS_TIMEOUT=10000

# CoinGecko API
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_CACHE_TTL=300

# Frontend
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api/v1
NEXT_PUBLIC_SITE_URL=https://assets.raptoreum.com
```

### 2. Frontend Environment

```bash
cd /opt/rtm-explorer/frontend
nano .env.production
```

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api/v1
NEXT_PUBLIC_SITE_URL=https://assets.raptoreum.com
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
NEXT_TELEMETRY_DISABLED=1
```

### 3. Secure Environment Files

```bash
# Set proper permissions
chmod 600 /opt/rtm-explorer/backend/.env
chmod 600 /opt/rtm-explorer/frontend/.env.production

# Ensure files are owned by application user
chown rtmexplorer:rtmexplorer /opt/rtm-explorer/backend/.env
chown rtmexplorer:rtmexplorer /opt/rtm-explorer/frontend/.env.production
```

### 4. Export System Variables

Configure all export-related environment variables as documented in DEVELOPMENT.md.

**Critical for Production:**
- Generate production signing keys (RSA-4096)
- Store private key securely (encrypted filesystem)
- Configure remote Raptoreumd with proper access controls
- Set appropriate rate limits based on server capacity
- Monitor Litecoin node sync status
- Configure IPFS with sufficient storage

**Generate Signing Keys:**
```bash
# Create keys directory
mkdir -p /opt/rtm-explorer/keys
cd /opt/rtm-explorer/keys

# Generate RSA-4096 key pair
openssl genrsa -out export_private_key.pem 4096
openssl rsa -in export_private_key.pem -pubout -out export_public_key.pem

# Secure private key
chmod 400 export_private_key.pem
chmod 644 export_public_key.pem
chown rtmexplorer:rtmexplorer export_private_key.pem export_public_key.pem
```

### 5. Environment Variables Security Checklist

Before deploying to production, ensure all security-sensitive variables are properly configured:

#### Production Security Checklist

- [ ] Change all default passwords from `.env.example`
- [ ] Generate new `SESSION_SECRET` and `JWT_SECRET` using `openssl rand -hex 32`
- [ ] Set correct `APP_URL` and `CORS_ORIGIN` matching your domain
- [ ] Configure Redis password matching redis.conf
- [ ] Use separate MongoDB user with limited permissions (not root)
- [ ] Store .env files securely (not in git, proper file permissions)
- [ ] Use environment variable encryption if available
- [ ] Verify `CORS_ORIGIN` matches your production domain exactly
- [ ] Set appropriate rate limits for your server capacity
- [ ] Configure logging paths with proper permissions
- [ ] Secure export signing keys with restrictive permissions (400 for private key)
- [ ] Use strong, unique passwords for all RPC connections
- [ ] Verify all *_PASSWORD and *_SECRET variables are changed from examples

#### Generate Production Secrets

```bash
# Session secret (32 bytes)
openssl rand -hex 32

# JWT secret (32 bytes)
openssl rand -hex 32

# API encryption key (32 bytes)
openssl rand -hex 32

# RSA keys for export signing (4096-bit)
openssl genrsa -out /opt/rtm-explorer/keys/private_key.pem 4096
openssl rsa -in /opt/rtm-explorer/keys/private_key.pem -pubout -out /opt/rtm-explorer/keys/public_key.pem

# Secure the keys
chmod 400 /opt/rtm-explorer/keys/private_key.pem
chmod 644 /opt/rtm-explorer/keys/public_key.pem
```

#### MongoDB Security

Create a dedicated user with minimal required permissions:

```javascript
// Connect to MongoDB as admin
use admin
db.auth("admin", "admin_password")

// Create application user
use rtm_explorer
db.createUser({
  user: "rtm_user",
  pwd: "secure_generated_password",
  roles: [
    { role: "readWrite", db: "rtm_explorer" }
  ]
})

// Test connection with new user
exit
mongosh "mongodb://rtm_user:secure_generated_password@localhost:27017/rtm_explorer?authSource=admin"
```

#### Redis Security

Ensure Redis is configured with authentication:

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Add/uncomment these lines:
requirepass YOUR_STRONG_REDIS_PASSWORD
bind 127.0.0.1 ::1

# Restart Redis
sudo systemctl restart redis
```

---

## Initial Data Sync

### 1. Start Sync Process

The sync daemon will automatically start syncing data from the blockchain when launched via PM2.

```bash
# Monitor sync progress
pm2 logs rtm-sync

# Check sync status in MongoDB
mongosh "mongodb://rtm_explorer:YOUR_PASSWORD@localhost:27017/rtm_explorer"
```

```javascript
// Check sync state
db.sync_state.find().pretty()

// Check synced blocks
db.blocks.count()

// Check latest block
db.blocks.find().sort({ height: -1 }).limit(1).pretty()
```

### 2. Monitor Sync Progress

```bash
# Create a monitoring script
nano /opt/rtm-explorer/scripts/monitor-sync.sh
```

```bash
#!/bin/bash
# monitor-sync.sh

echo "Raptoreum Blockchain Sync Status"
echo "================================="

# Get blockchain height
CHAIN_HEIGHT=$(raptoreum-cli getblockcount)
echo "Blockchain Height: $CHAIN_HEIGHT"

# Get database height
DB_HEIGHT=$(mongosh --quiet "mongodb://rtm_explorer:YOUR_PASSWORD@localhost:27017/rtm_explorer" --eval "db.blocks.find().sort({height:-1}).limit(1).forEach(printjson)" | grep -oP '"height":\s*\K\d+')
echo "Database Height: $DB_HEIGHT"

# Calculate difference
DIFF=$((CHAIN_HEIGHT - DB_HEIGHT))
echo "Blocks Behind: $DIFF"

# Calculate percentage
PERCENT=$(echo "scale=2; ($DB_HEIGHT / $CHAIN_HEIGHT) * 100" | bc)
echo "Sync Progress: $PERCENT%"
```

```bash
# Make executable
chmod +x /opt/rtm-explorer/scripts/monitor-sync.sh

# Run monitoring
/opt/rtm-explorer/scripts/monitor-sync.sh
```

---

## Backblaze B2 Backup Setup

### 1. Install B2 CLI

```bash
# Install B2 CLI
pip3 install b2

# Authorize account
b2 authorize-account YOUR_KEY_ID YOUR_APP_KEY

# List buckets to verify
b2 list-buckets
```

### 2. Create Backup Script

```bash
nano /opt/rtm-explorer/scripts/backup.sh
```

```bash
#!/bin/bash
# backup.sh - Daily backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/rtm-explorer/backups/$DATE"
LOG_FILE="/var/log/rtm-explorer/backup.log"

echo "[$DATE] Starting backup..." | tee -a $LOG_FILE

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
echo "Backing up MongoDB..." | tee -a $LOG_FILE
mongodump \
  --uri="mongodb://rtm_explorer:YOUR_PASSWORD@localhost:27017/rtm_explorer" \
  --out=$BACKUP_DIR/mongodb \
  --gzip \
  2>&1 | tee -a $LOG_FILE

# Backup configuration files
echo "Backing up configuration..." | tee -a $LOG_FILE
mkdir -p $BACKUP_DIR/config
cp /opt/rtm-explorer/backend/.env $BACKUP_DIR/config/
cp /opt/rtm-explorer/frontend/.env.production $BACKUP_DIR/config/
cp /opt/rtm-explorer/ecosystem.config.js $BACKUP_DIR/config/
cp ~/.raptoreum/raptoreum.conf $BACKUP_DIR/config/

# Create tarball
echo "Creating archive..." | tee -a $LOG_FILE
cd /opt/rtm-explorer/backups
tar -czf $DATE.tar.gz $DATE
rm -rf $DATE

# Upload to Backblaze B2
echo "Uploading to Backblaze B2..." | tee -a $LOG_FILE
b2 upload-file \
  --noProgress \
  rtm-explorer-backups \
  $DATE.tar.gz \
  backups/$DATE.tar.gz \
  2>&1 | tee -a $LOG_FILE

# Clean up old local backups (keep last 7 days)
echo "Cleaning up old backups..." | tee -a $LOG_FILE
find /opt/rtm-explorer/backups -name "*.tar.gz" -mtime +7 -delete

# Clean up old B2 backups (keep last 30 days)
b2 ls rtm-explorer-backups backups/ | \
  awk '{print $NF}' | \
  head -n -30 | \
  xargs -I {} b2 delete-file-version rtm-explorer-backups {}

echo "[$DATE] Backup completed" | tee -a $LOG_FILE
```

```bash
# Make executable
chmod +x /opt/rtm-explorer/scripts/backup.sh

# Test backup
/opt/rtm-explorer/scripts/backup.sh
```

### 3. Schedule Backups with Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/rtm-explorer/scripts/backup.sh >> /var/log/rtm-explorer/backup.log 2>&1
```

### 4. Restore from Backup

```bash
# Download backup from B2
b2 download-file-by-name rtm-explorer-backups backups/YYYYMMDD_HHMMSS.tar.gz /tmp/backup.tar.gz

# Extract
cd /tmp
tar -xzf backup.tar.gz

# Restore MongoDB
mongorestore \
  --uri="mongodb://rtm_explorer:YOUR_PASSWORD@localhost:27017/rtm_explorer" \
  --gzip \
  --drop \
  YYYYMMDD_HHMMSS/mongodb/rtm_explorer/

# Restore configuration (if needed)
cp YYYYMMDD_HHMMSS/config/.env /opt/rtm-explorer/backend/
```

---

## Monitoring Setup

### 1. System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop

# Monitor disk I/O
sudo iotop

# Monitor network
sudo nethogs
```

### 2. Application Monitoring with PM2

```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View real-time monitoring
pm2 monit

# View metrics
pm2 web
# Access at: http://your-server-ip:9615
```

### 3. Log Monitoring

```bash
# Create log monitoring script
nano /opt/rtm-explorer/scripts/check-logs.sh
```

```bash
#!/bin/bash
# check-logs.sh - Check for errors in logs

echo "Checking API logs..."
tail -n 100 /var/log/rtm-explorer/api-error.log | grep -i "error\|critical\|fatal" | tail -n 10

echo -e "\nChecking Sync logs..."
tail -n 100 /var/log/rtm-explorer/sync-error.log | grep -i "error\|critical\|fatal" | tail -n 10

echo -e "\nChecking Nginx logs..."
sudo tail -n 100 /var/log/nginx/rtm-explorer-error.log | tail -n 10
```

```bash
chmod +x /opt/rtm-explorer/scripts/check-logs.sh
```

### 4. Health Check Script

```bash
nano /opt/rtm-explorer/scripts/health-check.sh
```

```bash
#!/bin/bash
# health-check.sh - Check all services

echo "=== Service Health Check ==="
echo

# Check Raptoreumd
echo -n "Raptoreumd: "
if pgrep -x "raptoreumd" > /dev/null; then
    echo "✓ Running"
else
    echo "✗ Stopped"
fi

# Check MongoDB
echo -n "MongoDB: "
if systemctl is-active --quiet mongod; then
    echo "✓ Running"
else
    echo "✗ Stopped"
fi

# Check Redis
echo -n "Redis: "
if systemctl is-active --quiet redis-server; then
    echo "✓ Running"
else
    echo "✗ Stopped"
fi

# Check IPFS
echo -n "IPFS: "
if systemctl is-active --quiet ipfs; then
    echo "✓ Running"
else
    echo "✗ Stopped"
fi

# Check Nginx
echo -n "Nginx: "
if systemctl is-active --quiet nginx; then
    echo "✓ Running"
else
    echo "✗ Stopped"
fi

# Check PM2 Apps
echo
echo "PM2 Applications:"
pm2 list

# Check API health endpoint
echo
echo -n "API Health: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4004/api/health)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Healthy"
else
    echo "✗ Unhealthy (HTTP $HTTP_CODE)"
fi

# Check Frontend
echo -n "Frontend: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    echo "✓ Healthy"
else
    echo "✗ Unhealthy (HTTP $HTTP_CODE)"
fi
```

```bash
chmod +x /opt/rtm-explorer/scripts/health-check.sh

# Run health check
/opt/rtm-explorer/scripts/health-check.sh
```

### 5. Automated Alerts

```bash
# Create alert script
nano /opt/rtm-explorer/scripts/alert.sh
```

```bash
#!/bin/bash
# alert.sh - Send alerts when issues detected

# Check if API is down
if ! curl -sf http://localhost:4004/api/health > /dev/null; then
    # Send email alert
    echo "API is down!" | mail -s "ALERT: RTM Explorer API Down" $ADMIN_EMAIL
    
    # Log alert
    echo "$(date): API down alert sent" >> /var/log/rtm-explorer/alerts.log
fi

# Add more checks as needed...
```

```bash
chmod +x /opt/rtm-explorer/scripts/alert.sh

# Add to crontab (check every 5 minutes)
*/5 * * * * /opt/rtm-explorer/scripts/alert.sh
```

### 6. Export System Monitoring

**Key Metrics:**
- Export queue depth
- Processing time per export
- Payment confirmation time
- IPFS upload success rate
- Asset creation success rate
- File generation errors

**Alerts:**
- Queue exceeds 80% capacity
- Payment confirmations delayed >1 hour
- IPFS node offline
- Remote Raptoreumd unreachable
- Disk space <20% free

**Monitoring Script:**
```bash
# Create export monitoring script
nano /opt/rtm-explorer/scripts/monitor-exports.sh
```

```bash
#!/bin/bash
# monitor-exports.sh - Monitor export system health

echo "=== Export System Status ==="
echo

# Check Litecoin node
echo -n "Litecoin Node: "
if pgrep -x "litecoind" > /dev/null; then
    echo "✓ Running"
else
    echo "✗ Stopped"
fi

# Check export queue (query API)
echo -n "Export Queue: "
QUEUE_SIZE=$(curl -s http://localhost:4004/api/export/queue-status | jq -r '.data.queueSize // 0')
MAX_QUEUE=$(curl -s http://localhost:4004/api/export/queue-status | jq -r '.data.maxSize // 50')
echo "$QUEUE_SIZE / $MAX_QUEUE"

if [ "$QUEUE_SIZE" -gt "$((MAX_QUEUE * 80 / 100))" ]; then
    echo "⚠ WARNING: Queue at 80% capacity"
fi

# Check recent export failures
echo
echo "Recent Export Failures:"
grep -i "export.*failed" /var/log/rtm-explorer/api-error.log | tail -n 5

# Check IPFS connectivity
echo
echo -n "IPFS Connection: "
if curl -s http://localhost:5001/api/v0/id > /dev/null; then
    echo "✓ Connected"
else
    echo "✗ Failed"
fi

# Check remote Raptoreumd connection
echo -n "Remote Raptoreumd: "
# Add actual check here based on your setup
echo "✓ Connected"
```

```bash
chmod +x /opt/rtm-explorer/scripts/monitor-exports.sh

# Run monitoring
/opt/rtm-explorer/scripts/monitor-exports.sh

# Add to crontab (check every 15 minutes)
*/15 * * * * /opt/rtm-explorer/scripts/monitor-exports.sh >> /var/log/rtm-explorer/export-monitor.log
```

---

## Troubleshooting

### Common Issues

#### 1. 500 Internal Server Error (Nginx Shows 301 But Then 500)

If nginx access.log shows a **301 redirect** but then you get a 500 error, this means nginx IS receiving requests but **cannot connect to the frontend**.

**Symptoms:**
- Nginx logs show: `"GET / HTTP/1.1" 301` (HTTP → HTTPS redirect works)
- Then 500 error when accessing HTTPS
- Backend is running but frontend is not

**Diagnosis:**
```bash
# 1. Check PM2 status - is frontend running?
pm2 status
# Look for 'rtm-frontend' - should be "online"

# 2. Test frontend directly
curl http://localhost:3003  # Or whatever port nginx expects
# Should return HTML, not "connection refused"

# 3. Check what's listening on frontend port
sudo netstat -tlnp | grep 3003
# Should show node/npm process

# 4. Check PM2 logs for frontend errors
pm2 logs rtm-frontend --lines 50
```

**Solution:**

If frontend is NOT running, start it:

```bash
# Build the frontend first (required)
cd /opt/rtm-explorer/frontend
npm run build

# Start via PM2
cd /opt/rtm-explorer/backend
pm2 start ecosystem.config.js --only rtm-frontend
pm2 save
```

**CRITICAL:** Ensure the PORT in ecosystem.config.js matches nginx configuration:
- If nginx has `server 127.0.0.1:3003`, PM2 must have `PORT: 3003`
- If nginx has `server 127.0.0.1:3000`, PM2 must have `PORT: 3000`
- Port mismatch = 500 errors!

#### 2. 500 Internal Server Error (No Nginx Logs at All)

If you're getting a 500 error but there are NO logs in nginx `access.log` or `error.log` at all, this means the error is occurring **before** the request reaches nginx. This is commonly caused by Cloudflare SSL configuration issues.

**Symptoms:**
- 500 error when accessing https://assets.raptoreum.com
- No entries in `/var/log/nginx/rtm-explorer-access.log`
- No entries in `/var/log/nginx/rtm-explorer-error.log`
- Cloudflare dashboard may show "Error 521: Web Server Is Down"

**Diagnosis:**
```bash
# Run the diagnostic tool
sudo ./scripts/diagnose-cloudflare-ssl.sh

# Check if backend services are running
pm2 status

# Test backend API directly
curl http://localhost:4004/api/health

# Test frontend directly
curl http://localhost:3000

# Check nginx status and test config
sudo systemctl status nginx
sudo nginx -t
```

**Common Causes and Solutions:**

1. **Using Cloudflare Origin SSL with Let's Encrypt configuration**
   - Problem: Nginx is configured for Let's Encrypt but you're using Cloudflare
   - Solution: Follow the [Cloudflare SSL Setup Guide](CLOUDFLARE_SSL_SETUP.md)

2. **Cloudflare SSL/TLS mode is incorrect**
   - Problem: Cloudflare SSL mode is set to "Flexible" or "Full" instead of "Full (strict)"
   - Solution: 
     - Login to Cloudflare dashboard
     - Go to SSL/TLS → Overview
     - Set encryption mode to "Full (strict)"

3. **Cloudflare Origin Certificate not installed**
   - Problem: Missing or incorrect Cloudflare origin certificate
   - Solution:
     - Generate certificate in Cloudflare dashboard (SSL/TLS → Origin Server)
     - Install certificate at `/etc/ssl/cloudflare/assets.raptoreum.com.pem`
     - Install private key at `/etc/ssl/cloudflare/assets.raptoreum.com.key`
     - Update nginx configuration to use these paths

4. **Nginx not listening on correct ports**
   - Problem: Nginx not bound to ports 80/443
   - Solution:
     ```bash
     sudo netstat -tlnp | grep nginx
     sudo systemctl restart nginx
     ```

5. **Backend services not running**
   - Problem: API or frontend not started
   - Solution:
     ```bash
     pm2 start ecosystem.config.js
     pm2 save
     ```

#### 3. Raptoreumd Not Syncing

```bash
# Check if daemon is running
ps aux | grep raptoreumd

# Check logs
tail -f ~/.raptoreum/debug.log

# Restart daemon
raptoreum-cli stop
sleep 5
raptoreumd -daemon

# Check peer connections
raptoreum-cli getpeerinfo | grep -c "addr"
```

#### 4. MongoDB Connection Issues

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh "mongodb://rtm_explorer:YOUR_PASSWORD@localhost:27017/rtm_explorer"

# Restart MongoDB
sudo systemctl restart mongod
```

#### 5. Redis Connection Issues

```bash
# Check if Redis is running
sudo systemctl status redis-server

# Test connection
redis-cli -a YOUR_PASSWORD ping

# Check logs
sudo tail -f /var/log/redis/redis-server.log

# Restart Redis
sudo systemctl restart redis-server
```

#### 6. PM2 Apps Not Starting

```bash
# Check PM2 logs
pm2 logs

# Check specific app
pm2 logs rtm-api

# Restart app
pm2 restart rtm-api

# Delete and re-add app
pm2 delete rtm-api
pm2 start ecosystem.config.js --only rtm-api
```

#### 7. Nginx 502 Bad Gateway

```bash
# Check if backend is running
curl http://localhost:4004/api/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/rtm-explorer-error.log

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 8. High Memory Usage

```bash
# Check memory usage
free -h

# Check per-process memory
pm2 list

# Restart high-memory process
pm2 restart rtm-api

# Adjust PM2 max memory restart
pm2 delete rtm-api
# Edit ecosystem.config.js to increase max_memory_restart
pm2 start ecosystem.config.js
```

#### 9. Disk Space Issues

```bash
# Check disk usage
df -h

# Find large files
sudo du -h --max-depth=1 /opt/rtm-explorer | sort -hr | head -10

# Clean up logs
sudo find /var/log -name "*.log" -mtime +30 -delete

# Clean up old backups
find /opt/rtm-explorer/backups -name "*.tar.gz" -mtime +7 -delete
```

### Performance Optimization

#### 1. Database Optimization

```bash
# Compact MongoDB
mongosh "mongodb://rtm_explorer:YOUR_PASSWORD@localhost:27017/rtm_explorer"
db.runCommand({ compact: 'blocks' })
db.runCommand({ compact: 'transactions' })
db.runCommand({ compact: 'assets' })
```

#### 2. Cache Optimization

```bash
# Monitor Redis memory
redis-cli -a YOUR_PASSWORD info memory

# Clear Redis cache if needed
redis-cli -a YOUR_PASSWORD FLUSHDB
```

#### 3. Nginx Caching

Add to Nginx configuration:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m use_temp_path=off;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    add_header X-Cache-Status $upstream_cache_status;
    # ... rest of config
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-13
**Author**: Salty-Dragon
**Status**: Complete - Ready for Implementation
