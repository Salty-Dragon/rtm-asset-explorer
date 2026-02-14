# Raptoreum Asset Explorer - Backend API

REST API server for the Raptoreum Asset Explorer, built according to the architecture specifications.

## Overview

This backend implements a production-ready REST API server with:
- **Express.js 5.x** server on port 4004
- **MongoDB** for blockchain data caching and indexing
- **Redis** for response caching and rate limiting
- **Winston** for structured logging
- **Zod** for input validation
- **Graceful degradation** when services are unavailable

## Prerequisites

- Node.js 20+ LTS (tested with Node.js 24)
- MongoDB 8.x
- Redis 8.x
- Raptoreumd node with RPC enabled (port 10225)

## Installation

```bash
cd backend
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:

```env
PORT=4004
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rtm_explorer
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
RAPTOREUMD_HOST=127.0.0.1
RAPTOREUMD_PORT=10225
RAPTOREUMD_USER=rtm_explorer
RAPTOREUMD_PASSWORD=your_secure_password
```

## Development

Start the server in development mode:

```bash
npm run dev
```

The server will run on port 4004 by default and restart on file changes.

## Production

### Using PM2 (Recommended)

Start with PM2 in cluster mode:

```bash
pm2 start ecosystem.config.js
```

PM2 commands:
```bash
pm2 status              # Check status
pm2 logs rtm-api       # View logs
pm2 restart rtm-api    # Restart server
pm2 stop rtm-api       # Stop server
pm2 delete rtm-api     # Remove from PM2
```

### Direct Start

```bash
NODE_ENV=production npm start
```

## Architecture

```
backend/
├── src/
│   ├── models/         # Mongoose database schemas
│   │   ├── Address.js      # Address information
│   │   ├── ApiKey.js       # API key management
│   │   ├── Asset.js        # Asset registry
│   │   ├── AuditLog.js     # Audit trail
│   │   ├── Block.js        # Block data
│   │   └── Transaction.js  # Transaction history
│   ├── routes/         # API endpoint handlers
│   │   ├── addresses.js    # Address endpoints
│   │   ├── assets.js       # Asset endpoints
│   │   ├── blocks.js       # Block endpoints
│   │   ├── health.js       # Health checks
│   │   ├── stats.js        # Statistics
│   │   └── transactions.js # Transaction endpoints
│   ├── middleware/     # Express middleware
│   │   ├── auth.js         # API key authentication
│   │   ├── cache.js        # Response caching
│   │   ├── errorHandler.js # Error handling
│   │   ├── rateLimit.js    # Rate limiting
│   │   └── validation.js   # Input validation
│   ├── services/       # Business logic
│   │   ├── blockchain.js   # Raptoreumd RPC client
│   │   ├── cache.js        # Redis operations
│   │   └── database.js     # MongoDB connection
│   ├── utils/          # Utilities
│   │   └── logger.js       # Winston logger
│   └── server.js       # Main entry point
├── ecosystem.config.js # PM2 configuration
├── package.json
└── .env.example
```

## API Endpoints

All endpoints follow a consistent response format (see Response Format section below).

### Health Check
- `GET /api/health` - Check service health status
  - Returns status of MongoDB, Redis, and Blockchain connections
  - Status: 200 (healthy) or 503 (degraded)

### Blocks
- `GET /api/blocks` - List recent blocks
  - Query params: `limit` (1-100, default 20), `offset` (default 0)
  - Returns paginated list of blocks
- `GET /api/blocks/:height` - Get block by height
  - Validates block height is a positive integer
  - Falls back to blockchain if not in database

### Transactions
- `GET /api/transactions/:txid` - Get transaction by ID
  - Validates txid format: `/^[a-f0-9]{64}$/i`
  - Falls back to blockchain if not in database

### Assets
- `GET /api/assets` - List assets
  - Query params: `limit`, `offset`, `type` (fungible/non-fungible), `creator`
  - Returns paginated list of assets
- `GET /api/assets/:assetId` - Get asset by ID
  - Validates asset ID format
  - Falls back to blockchain if not in database
  - Increments view counter

### Addresses
- `GET /api/addresses/:address` - Get address information
  - Validates Raptoreum address: `/^R[A-Za-z0-9]{33}$/`
  - Returns balance, transaction count, asset holdings

### Statistics
- `GET /api/stats` - Get blockchain statistics
  - Returns blockchain info, database counts, sync status
  - Cached for 30 seconds

## Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "meta": {
    "timestamp": "2026-02-14T02:00:00.000Z",
    "requestId": "req_abc123",
    "dataSource": "cache|database|blockchain"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": [
      {
        "field": "fieldName",
        "message": "Validation error message"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-14T02:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Validation error
- `401` - Unauthorized (invalid or missing API key)
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Internal server error
- `503` - Service unavailable (degraded mode)

## Rate Limiting

Rate limiting is applied globally to all API endpoints:

- **Free tier**: 100 requests/minute (default)
- **Premium tier**: 1000 requests/minute (with valid API key)

Rate limit headers are included in responses:
- `X-RateLimit-Limit` - Maximum requests per window
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Unix timestamp when the limit resets

### Using API Keys

Include your API key in the request header:

```bash
curl -H "X-API-Key: your_api_key_here" http://localhost:4004/api/assets
```

API keys are hashed using SHA-256 and stored securely in MongoDB.

## Validation Rules

All inputs are validated using Zod schemas:

- **Raptoreum address**: `/^R[A-Za-z0-9]{33}$/`
- **Transaction ID**: `/^[a-f0-9]{64}$/i`
- **Block hash**: `/^[a-f0-9]{64}$/i`
- **Asset ID**: `/^[A-Z0-9_]{3,30}$/`
- **Block height**: Non-negative integer
- **Pagination limit**: 1-100 (default: 20)
- **Pagination offset**: Non-negative integer (default: 0)

Invalid inputs return a 400 error with detailed validation messages.

## Security Features

### Built-in Protection

1. **Helmet.js** - Security headers (XSS, clickjacking, etc.)
2. **CORS** - Cross-origin resource sharing configured
3. **Rate Limiting** - Redis-based, per-IP and per-API-key
4. **Input Validation** - All inputs validated with Zod
5. **Request Size Limits** - 1MB max for JSON payloads
6. **API Key Hashing** - SHA-256 hashing for stored keys
7. **Audit Logging** - All requests logged to MongoDB
8. **Compression** - Gzip/Brotli compression for responses

### Authentication

API key authentication is optional but recommended for higher rate limits.
Keys are hashed before storage and validated on each request.

### Error Handling

- Centralized error handling catches all exceptions
- Stack traces only shown in development mode
- All errors include unique request IDs for tracking
- Failed database operations degrade gracefully

## Graceful Degradation

The server continues to operate even when dependencies are unavailable:

- **MongoDB down**: Returns 500 errors but server stays up
- **Redis down**: Skips caching and rate limiting, logs warnings
- **Blockchain down**: Returns errors for blockchain-only queries

Health check endpoint (`/api/health`) reports status of all services.

## Monitoring

### Logging

Logs are written with Winston in JSON format:

- **Console**: Colored output in development
- **logs/error.log**: Errors only (production)
- **logs/combined.log**: All logs (production)

Log levels: `error`, `warn`, `info`, `debug`

Configure with `LOG_LEVEL` environment variable.

### Request Logging

All requests are logged with:
- HTTP method and path
- Status code
- Response time
- Unique request ID

### Health Monitoring

The `/api/health` endpoint provides detailed status of:
- MongoDB connection
- Redis connection  
- Blockchain RPC connection
- Overall service health

## Performance

### Caching Strategy

- **Redis caching**: Responses cached with configurable TTLs
  - Health checks: Not cached
  - Blocks: 5 minutes (300s)
  - Transactions: 5 minutes (300s)
  - Assets: 5 minutes (300s)
  - Addresses: 1 minute (60s)
  - Stats: 30 seconds
  
- **Cache keys**: `cache:api:{path}`
- **Automatic invalidation**: On service restart

### Database Optimization

All models include strategic indexes for common queries:
- Block height, hash, timestamp
- Transaction ID, block height
- Asset ID, creator, owner
- Address, balance
- Compound indexes for filtered queries

## Testing

Manual testing can be done with curl:

```bash
# Test health check
curl http://localhost:4004/api/health

# Test blocks endpoint
curl http://localhost:4004/api/blocks?limit=5

# Test specific block
curl http://localhost:4004/api/blocks/100

# Test validation error
curl http://localhost:4004/api/blocks/invalid

# Test address lookup
curl http://localhost:4004/api/addresses/R9PaJKwZk2VPrE7W8wTgGAD5D6e2cW4oJv
```

## Troubleshooting

### Server won't start

1. Check MongoDB is running: `mongosh`
2. Check Redis is running: `redis-cli ping`
3. Verify environment variables in `.env`
4. Check logs for specific errors

### Rate limiting not working

- Redis must be running
- Check Redis connection in health endpoint
- Rate limiting will be skipped if Redis is unavailable

### Blockchain queries failing

- Verify Raptoreumd is running and synced
- Check RPC credentials in `.env`
- Test RPC connection: `curl --user user:pass http://localhost:10225`

### Database queries timing out

- Ensure MongoDB is running and accessible
- Check connection string in `.env`
- Verify network connectivity to MongoDB

## Production Deployment

### Recommended Setup

1. **Reverse Proxy**: Nginx with SSL termination
2. **Process Manager**: PM2 in cluster mode (2+ instances)
3. **Monitoring**: PM2 monitoring or external service
4. **Backups**: Daily MongoDB backups to Backblaze B2
5. **Logging**: Rotate logs with PM2 or logrotate

### Environment Variables

Production-specific settings:
```env
NODE_ENV=production
PORT=4004
LOG_LEVEL=info
```

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong MongoDB passwords
- [ ] Enable MongoDB authentication
- [ ] Configure firewall rules
- [ ] Enable SSL/TLS for MongoDB
- [ ] Use environment-specific .env files
- [ ] Set up log rotation
- [ ] Configure backup strategy

## License

MIT
