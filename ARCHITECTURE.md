# System Architecture

## Overview

The Raptoreum Asset Explorer is a modern, high-performance blockchain explorer and asset viewer built to showcase Raptoreum's unique asset capabilities. The system prioritizes security, data integrity, performance, and professional presentation.

## System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Frontend Layer                            │
│                     Next.js 16+ / Tailwind CSS                      │
│                    (Port 3000, reverse proxied)                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Nginx Reverse Proxy                          │
│               SSL Termination / Rate Limiting / Caching             │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            API Layer                                 │
│                  Node.js / Express (Port 4004)                      │
│         Rate Limiting / Auth / Validation / Caching                 │
└──┬─────────────────┬────────────────┬───────────────────────────────┘
   │                 │                │
   │                 │                └──────────────────┐
   ▼                 ▼                                   ▼
┌─────────┐    ┌──────────┐                      ┌──────────┐
│ Redis   │    │ MongoDB  │                      │   IPFS   │
│ Cache   │    │ Database │                      │  Node    │
│         │    │          │                      │          │
└─────────┘    └──────────┘                      └──────────┘
                     │                                  │
                     │                                  │
                     └────────┬─────────────────────────┘
                              ▼
                     ┌──────────────┐
                     │ Raptoreumd   │
                     │  RPC Server  │
                     │  (Port 10225) │
                     └──────────────┘
```

## Technology Stack

### Frontend
- **Next.js 16+** (App Router)
  - Server-side rendering for SEO
  - Static generation for performance
  - API routes for server-side operations
  - Image optimization built-in
  
- **Tailwind CSS**
  - Utility-first styling
  - Responsive design
  - Dark mode support
  - Custom theme for Raptoreum branding

- **shadcn/ui**
  - Pre-built accessible components
  - Customizable and themeable
  - Radix UI primitives underneath

- **React Query (TanStack Query)**
  - Server state management
  - Automatic caching
  - Background refetching
  - Optimistic updates

- **Zustand** (or Jotai)
  - Client state management
  - Simple API
  - TypeScript-first

- **Framer Motion**
  - Smooth animations
  - Page transitions
  - Micro-interactions

### Backend

- **Node.js 24 LTS**
  - Stable, long-term support
  - Modern JavaScript features
  - Excellent performance

- **Express.js 5.x**
  - Mature, well-documented
  - Large middleware ecosystem
  - RESTful API design

- **Mongoose**
  - MongoDB ODM
  - Schema validation
  - Middleware hooks
  - Query building

- **Redis 8.x**
  - In-memory caching
  - Rate limiting
  - Session storage
  - Real-time features (Pub/Sub)

- **Winston**
  - Logging library for Node.js
  - Multiple transport support (file, console, remote)
  - Log levels (error, warn, info, debug)
  - Structured logging with metadata
  - Log rotation and archival

### Blockchain & Storage

- **Raptoreumd**
  - Full node implementation
  - RPC interface for queries
  - Blockchain source of truth

- **IPFS (Kubo)**
  - Decentralized content storage
  - Metadata and media hosting
  - Local pinning for reliability

- **MongoDB 8.x**
  - Document database
  - Flexible schema
  - Powerful aggregation
  - Full-text search

### Infrastructure (OVH Server)

- **Operating System**: Ubuntu 22.04 LTS or Debian 12
- **Process Manager**: PM2
  - Process monitoring
  - Auto-restart on failure
  - Log management
  - Zero-downtime deploys  
- **Reverse Proxy**: Nginx
  - SSL/TLS termination (Let's Encrypt)
  - Load balancing (if needed)
  - Static file serving
  - Gzip compression
  - Rate limiting  
- **Backup**: Backblaze B2
  - Daily automated backups
  - MongoDB dumps
  - Configuration files
  - 30-day retention

## Component Details

### 1. Raptoreumd Node

**Purpose**: Source of truth for all blockchain data

**Configuration**:
```ini
# raptoreum.conf
daemon=1
server=1
rpcuser=rtm_explorer
rpcpassword=<secure_password>
rpcallowip=127.0.0.1
rpcport=10225
txindex=1
addressindex=1
timestampindex=1
spentindex=1
assetindex=1
```

**APIs Used**:
- `getblockchaininfo` - Sync status
- `getblock` - Block data
- `getrawtransaction` - Transaction details
- `getassetdetailsbyid` - Asset information by tranbsaction ID
- `getassetdetailsbyname` - Raptoreum has unique named assets, get asset information by name
- `listassets` - Asset enumeration, this command lists all assets on the blockchain

**Critical Operations** (Always from Blockchain):
- Asset ownership verification (there is no RPC command for this, so we may need to fund another way)
- Transaction confirmations
- Current blockchain state
- Asset creation/transfer validation

### 2. IPFS Node

**Purpose**: To list asset attached files information and pin state

**Configuration**:
- Follow-only node (doesn't need to be publicly accessible)
- Local gateway for fast access

**Operations**:
- Fetch metadata by hash
- Verify content integrity
- Cache frequently accessed data

**Fallbacks**:
- Secondary remote follower node
- Multiple gateway attempts
- Timeout handling

### 3. MongoDB Database

**Purpose**: Indexed, queryable blockchain data cache

**Collections**: (See DATABASE.md for full schema)
- `blocks` - Block information
- `transactions` - Transaction history
- `assets` - Asset registry
- `asset_transfers` - Transfer history
- `addresses` - Address information
- `api_keys` - API authentication
- `audit_logs` - Legal compliance trail
- `analytics` - Aggregated statistics
- `ipfs_cache` - IPFS content cache
- `sync_state` - Synchronization status

**Optimization**:
- Strategic indexing for common queries
- Text search for asset discovery
- Aggregation pipelines for analytics
- TTL indexes for log expiration

### 4. Redis Cache

**Purpose**: High-speed caching and rate limiting

**Use Cases**:
```javascript
// API response caching
cache:api:/assets/:id -> { asset data }
cache:api:/blocks/:height -> { block data }

// Rate limiting
ratelimit:ip:<ip-address> -> request count
ratelimit:apikey:<key-hash> -> request count

// Session management
session:<session-id> -> { user data }

// Real-time data
stats:current -> { current blockchain stats }
```

**Configuration**:
- Memory limit: 2-4GB
- Eviction policy: allkeys-lru
- Persistence: AOF enabled (for important data)

### 5. Node.js API Server

**Purpose**: RESTful API for data access

**Architecture**:
```
routes/
├── blocks.js          # Block endpoints
├── transactions.js    # Transaction endpoints
├── assets.js          # Asset endpoints
├── addresses.js       # Address endpoints
├── search.js          # Search endpoints
└── stats.js           # Statistics endpoints

middleware/
├── auth.js            # API key authentication
├── rateLimit.js       # Rate limiting
├── validation.js      # Input validation
├── cache.js           # Response caching
└── logger.js          # Request logging

services/
├── blockchain.js      # Raptoreumd interaction
├── ipfs.js            # IPFS operations
├── database.js        # MongoDB queries
├── cache.js           # Redis operations
└── sync.js            # Blockchain syncing
```

**Security Measures**:
- Input validation and sanitization
- Rate limiting per IP and API key
- API key authentication for sensitive operations
- CORS configuration
- Helmet.js security headers
- Request size limits

**Performance**:
- Response caching in Redis
- Database query optimization
- Connection pooling
- Compression (gzip/brotli)

### 6. Next.js Frontend

**Architecture**:
```
app/
├── (pages)/
│   ├── page.tsx                    # Homepage
│   ├── assets/
│   │   ├── page.tsx                # Asset gallery
│   │   └── [id]/page.tsx           # Asset detail
│   ├── blocks/
│   │   ├── page.tsx                # Block list
│   │   └── [height]/page.tsx       # Block detail
│   ├── transactions/
│   │   └── [txid]/page.tsx         # Transaction detail
│   ├── addresses/
│   │   └── [address]/page.tsx      # Address detail
│   ├── creators/
│   │   ├── page.tsx                # Creator directory
│   │   └── [address]/page.tsx      # Creator profile
│   ├── search/
│   │   └── page.tsx                # Search results
│   └── api-docs/
│       └── page.tsx                # API documentation
├── api/                            # API routes
├── components/                     # React components
├── lib/                            # Utilities
└── styles/                         # Global styles

components/
├── ui/                             # shadcn/ui components
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Sidebar.tsx
├── blocks/
│   ├── BlockCard.tsx
│   └── BlockList.tsx
├── assets/
│   ├── AssetCard.tsx
│   ├── AssetGrid.tsx
│   ├── AssetDetail.tsx
│   └── AssetGallery.tsx
├── transactions/
│   ├── TransactionList.tsx
│   └── TransactionDetail.tsx
└── shared/
    ├── SearchBar.tsx
    ├── Pagination.tsx
    └── LoadingSpinner.tsx
```

## Data Flow

### Asset Viewing Flow

```
User Request → Next.js Page → React Query
                                    ↓
                              Check Cache
                                    ↓
                              API Request
                                    ↓
                            API Server (Express)
                                    ↓
                          Check Redis Cache
                                    ↓ (cache miss)
                          Query MongoDB
                                    ↓
                    Verify Critical Data from Blockchain
                                    ↓
                          Fetch IPFS Metadata
                                    ↓
                      Combine & Validate Data
                                    ↓
                          Cache in Redis
                                    ↓
                          Return JSON
                                    ↓
                          Display to User
```

### Blockchain Sync Flow

```
Sync Service (PM2 Process)
         ↓
Check Current Block Height (MongoDB)
         ↓
Get Latest Block Height (Raptoreumd)
         ↓
For Each Missing Block:
    ↓
    Fetch Block Data
    ↓
    Process Transactions
    ↓
    Detect Asset Operations
    ↓
    Fetch IPFS Metadata
    ↓
    Update MongoDB Collections
    ↓
    Log Progress
    ↓
Update Sync State
```

## Security Architecture

### Trust Boundaries

**Blockchain (Highest Trust)**:
- Asset ownership
- Transaction history
- Block data
- Consensus state

**IPFS (Medium Trust)**:
- Content addressed (hash-verified)
- Immutable metadata
- Can verify integrity

**Database (Low Trust)**:
- Performance cache only
- Must verify critical data
- Subject to re-sync

**User Input (No Trust)**:
- Always validate
- Sanitize all inputs
- Rate limit requests
- Log for audit

### Authentication & Authorization

**Public Endpoints** (Read-only):
- Asset viewing
- Block explorer
- Search
- Statistics

**Authenticated Endpoints** (API Key Required):
- High-frequency access
- Bulk data export
- Asset creation (if implemented)

**API Key Tiers**:
- **Free**: 100 requests/minute
- **Premium**: 1000 requests/minute

### Audit Logging

All API requests are logged to `audit_logs` collection:
- Request details (IP, endpoint, params)
- Authentication info
- Data source (blockchain vs cache)
- Response status
- Timestamp

**Retention**: 90 days (configurable for legal requirements)

## Deployment Architecture

### Process Management (PM2)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'rtm-api',
      script: './backend/src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'rtm-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'rtm-sync',
      script: './backend/src/services/sync-daemon.js',
      instances: 1
    }
  ]
}
```

### Nginx Configuration

```nginx
upstream api_backend {
    least_conn;
    server 127.0.0.1:4000;
}

upstream frontend_backend {
    server 127.0.0.1:3000;
}

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 443 ssl http2;
    server_name assets.raptoreum.com;

    ssl_certificate /etc/letsencrypt/live/assets.raptoreum.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/assets.raptoreum.com/privkey.pem;

    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://api_backend;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://frontend_backend;
    }
}
```

### Backup Strategy (Backblaze B2)

```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/rtm-explorer/backups/$DATE"

# MongoDB backup
mongodump --out=$BACKUP_DIR/mongodb

# Compress and upload to Backblaze
tar -czf $BACKUP_DIR.tar.gz -C /opt/rtm-explorer/backups $DATE
b2 upload-file rtm-explorer-backups $BACKUP_DIR.tar.gz backups/$DATE.tar.gz

# Clean up (keep last 7 days)
find /opt/rtm-explorer/backups -name "*.tar.gz" -mtime +7 -delete
```

## Monitoring & Observability

### Logging (Winston)

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Health Checks

**Endpoints**:
- `/api/health` - Basic health check
- `/api/health/blockchain` - Raptoreumd connection
- `/api/health/database` - MongoDB connection
- `/api/health/cache` - Redis connection
- `/api/health/ipfs` - IPFS node status

---

**Document Version**: 1.0
**Last Updated**: 2026-02-13
**Author**: Salty-Dragon
**Status**: Draft - Ready for Review
