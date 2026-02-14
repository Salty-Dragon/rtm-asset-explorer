# Raptoreum Asset Explorer - Backend API

REST API server for the Raptoreum Asset Explorer.

## Prerequisites

- Node.js 20+ LTS
- MongoDB 8.x
- Redis 8.x
- Raptoreumd node (with RPC enabled)

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- MongoDB connection string
- Redis host/port
- Raptoreumd RPC credentials

## Development

Start the server in development mode:

```bash
npm run dev
```

The server will run on port 4004 by default.

## Production

Start with PM2:

```bash
pm2 start ecosystem.config.js
```

Or start directly:

```bash
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Check service health status

### Blocks
- `GET /api/blocks` - List recent blocks
- `GET /api/blocks/:height` - Get block by height

### Transactions
- `GET /api/transactions/:txid` - Get transaction by ID

### Assets
- `GET /api/assets` - List assets
- `GET /api/assets/:assetId` - Get asset by ID

### Addresses
- `GET /api/addresses/:address` - Get address information

### Statistics
- `GET /api/stats` - Get blockchain statistics

## Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": { ... },
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
    "message": "Error description"
  },
  "meta": {
    "timestamp": "2026-02-14T02:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

## Rate Limiting

- Free tier: 100 requests/minute
- Premium tier: 1000 requests/minute

Include `X-API-Key` header for authenticated requests.

## Validation Rules

- Raptoreum address: `/^R[A-Za-z0-9]{33}$/`
- Transaction ID: `/^[a-f0-9]{64}$/i`
- Block hash: `/^[a-f0-9]{64}$/i`
- Asset ID: `/^[A-Z0-9_]{3,30}$/`

## Architecture

```
backend/
├── src/
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API endpoints
│   ├── middleware/     # Express middleware
│   ├── services/       # Business logic
│   ├── utils/          # Utilities
│   └── server.js       # Main entry point
├── ecosystem.config.js # PM2 configuration
├── package.json
└── .env.example
```

## Security Features

- Helmet.js security headers
- CORS configuration
- Rate limiting (Redis-based)
- Input validation (Zod)
- API key authentication
- Audit logging
- Request size limits

## Monitoring

Logs are written to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

## License

MIT
