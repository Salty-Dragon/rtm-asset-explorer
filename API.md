# API Documentation

## Overview

The Raptoreum Asset Explorer API provides programmatic access to blockchain data, asset information, and analytics. The API is RESTful, returns JSON responses, and supports both public and authenticated access.

**Base URL**: `https://assets.raptoreum.com/api/v1`

**Note**: This is a public API. Third-party services are encouraged to use it, but must respect rate limits.

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
   - [Blockchain](#blockchain-endpoints)
   - [Assets](#asset-endpoints)
   - [Transactions](#transaction-endpoints)
   - [Addresses](#address-endpoints)
   - [Search](#search-endpoints)
   - [Statistics](#statistics-endpoints)
   - [Health](#health-endpoints)
   - [Export](#export-endpoints)

## Authentication

### Public Access
Most endpoints are publicly accessible without authentication. Rate limits apply.

### API Key Authentication
For higher rate limits or sensitive operations, use API key authentication.

**Header**:
```http
Authorization: Bearer YOUR_API_KEY
```

**Request API Key**: Contact the Raptoreum team or apply through the website.

**API Key Tiers**:
- **Free Tier**: 100 requests/minute
- **Premium Tier**: 1000 requests/minute

## Rate Limiting

Rate limits are enforced per IP address (public access) or API key (authenticated access).

**Rate Limit Headers** (included in all responses):
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

**When rate limit is exceeded**:
```http
HTTP/1.1 429 Too Many Requests
```
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again in 60 seconds.",
    "retryAfter": 60
  }
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2026-02-13T21:51:13Z",
    "requestId": "req_1234567890",
    "dataSource": "cache|blockchain|ipfs"
  }
}
```

### Pagination
For endpoints that return lists, pagination is supported:

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response includes**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1000,
    "pages": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error details (optional)
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Endpoints

## Blockchain Endpoints

### Get Blockchain Info

Get current blockchain information and sync status.

**Endpoint**: `GET /blockchain/info`

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "chain": "main",
    "blocks": 1234567,
    "headers": 1234567,
    "bestBlockHash": "0000000000000000000...",
    "difficulty": 123456.789,
    "medianTime": 1708723200,
    "verificationProgress": 1.0,
    "chainWork": "000000000000000000000...",
    "size": 123456789,
    "pruned": false,
    "syncStatus": {
      "synced": true,
      "progress": 100,
      "behindBlocks": 0
    }
  }
}
```

### Get Block by Height

Get detailed information about a specific block by its height.

**Endpoint**: `GET /blockchain/blocks/:height`

**Parameters**:
- `height` (path) - Block height number

**Response**:
```json
{
  "success": true,
  "data": {
    "height": 1234567,
    "hash": "00000000000000000001234567890abcdef...",
    "previousHash": "00000000000000000001234567890abcdef...",
    "merkleRoot": "abcdef1234567890...",
    "timestamp": "2026-02-13T21:51:13Z",
    "difficulty": 123456.789,
    "nonce": 987654321,
    "size": 1234567,
    "transactionCount": 42,
    "transactions": [
      "txid1...",
      "txid2...",
      "..."
    ],
    "miner": "RMinerAddress123...",
    "reward": 5000.0,
    "confirmations": 100
  }
}
```

### Get Block by Hash

Get detailed information about a specific block by its hash.

**Endpoint**: `GET /blockchain/blocks/hash/:hash`

**Parameters**:
- `hash` (path) - Block hash

**Response**: Same as Get Block by Height

### List Recent Blocks

Get a list of recent blocks.

**Endpoint**: `GET /blockchain/blocks`

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort order: `asc` or `desc` (default: `desc`)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "height": 1234567,
      "hash": "00000000000000000001234567890abcdef...",
      "timestamp": "2026-02-13T21:51:13Z",
      "transactionCount": 42,
      "miner": "RMinerAddress123...",
      "size": 1234567,
      "confirmations": 100
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1234567,
    "pages": 61729,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Asset Endpoints

### List Assets

Get a paginated list of assets with filtering and sorting options.

**Endpoint**: `GET /assets`

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `type` - Filter by type: `fungible` or `non-fungible`
- `creator` - Filter by creator address
- `sort` - Sort field: `created`, `name`, `transfers`, `views` (default: `created`)
- `order` - Sort order: `asc` or `desc` (default: `desc`)
- `featured` - Filter featured assets: `true` or `false`
- `category` - Filter by category
- `tag` - Filter by tag

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "assetId": "ASSET_ID_123",
      "name": "Cool NFT #1",
      "type": "non-fungible",
      "creator": "RCreatorAddress123...",
      "currentOwner": "ROwnerAddress456...",
      "createdAt": "2026-02-01T12:00:00Z",
      "metadata": {
        "name": "Cool NFT #1",
        "description": "An awesome digital artwork",
        "image": "QmImageHash123...",
        "imageUrl": "https://ipfs.io/ipfs/QmImageHash123...",
        "attributes": [
          {
            "trait_type": "Color",
            "value": "Blue"
          },
          {
            "trait_type": "Rarity",
            "value": "Rare"
          }
        ]
      },
      "transferCount": 5,
      "views": 1234,
      "featured": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5000,
    "pages": 250,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Get Asset Details

Get detailed information about a specific asset.

**Endpoint**: `GET /assets/:assetId`

**Parameters**:
- `assetId` (path) - Asset identifier

**Query Parameters**:
- `verify` - Verify ownership from blockchain: `true` or `false` (default: `false`)

**Response**:
```json
{
  "success": true,
  "data": {
    "assetId": "ASSET_ID_123",
    "name": "Cool NFT #1",
    "type": "non-fungible",
    "creator": "RCreatorAddress123...",
    "currentOwner": "ROwnerAddress456...",
    "createdAt": "2026-02-01T12:00:00Z",
    "createdTxid": "txid123...",
    "createdBlockHeight": 1234000,
    "metadata": {
      "name": "Cool NFT #1",
      "description": "An awesome digital artwork",
      "image": "QmImageHash123...",
      "imageUrl": "https://ipfs.io/ipfs/QmImageHash123...",
      "animationUrl": null,
      "externalUrl": "https://example.com/nft/123",
      "attributes": [
        {
          "trait_type": "Color",
          "value": "Blue"
        },
        {
          "trait_type": "Rarity",
          "value": "Rare"
        }
      ],
      "properties": {
        "creator": "Artist Name",
        "edition": "1/1"
      }
    },
    "ipfsHash": "QmMetadataHash123...",
    "ipfsVerified": true,
    "transferCount": 5,
    "lastTransfer": {
      "txid": "txid789...",
      "from": "RPrevOwner...",
      "to": "ROwnerAddress456...",
      "timestamp": "2026-02-10T15:30:00Z"
    },
    "views": 1234,
    "favorites": 42,
    "verified": true,
    "featured": false,
    "tags": ["art", "blue", "rare"],
    "categories": ["Digital Art"]
  },
  "meta": {
    "timestamp": "2026-02-13T21:51:13Z",
    "requestId": "req_1234567890",
    "dataSource": "cache",
    "blockchainVerified": false
  }
}
```

### Get Asset Transfer History

Get the transfer history for a specific asset.

**Endpoint**: `GET /assets/:assetId/transfers`

**Parameters**:
- `assetId` (path) - Asset identifier

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "txid": "txid123...",
      "blockHeight": 1234567,
      "timestamp": "2026-02-13T21:51:13Z",
      "from": "RFromAddress123...",
      "to": "RToAddress456...",
      "type": "transfer",
      "fee": 0.001,
      "confirmations": 100
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Get Assets by Creator

Get all assets created by a specific address.

**Endpoint**: `GET /assets/creator/:address`

**Parameters**:
- `address` (path) - Creator address

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `type` - Filter by type: `fungible` or `non-fungible`
- `sort` - Sort field: `created`, `name`, `transfers` (default: `created`)
- `order` - Sort order: `asc` or `desc` (default: `desc`)

**Response**: Same structure as List Assets

---

## Transaction Endpoints

### Get Transaction Details

Get detailed information about a specific transaction.

**Endpoint**: `GET /transactions/:txid`

**Parameters**:
- `txid` (path) - Transaction ID

**Response**:
```json
{
  "success": true,
  "data": {
    "txid": "txid123...",
    "blockHeight": 1234567,
    "blockHash": "blockhash123...",
    "timestamp": "2026-02-13T21:51:13Z",
    "confirmations": 100,
    "size": 250,
    "fee": 0.001,
    "inputs": [
      {
        "txid": "prevtxid123...",
        "vout": 0,
        "address": "RInputAddress123...",
        "amount": 100.5,
        "scriptSig": "..."
      }
    ],
    "outputs": [
      {
        "n": 0,
        "address": "ROutputAddress456...",
        "amount": 50.0,
        "scriptPubKey": "...",
        "spent": true,
        "spentTxid": "nexttxid456...",
        "spentAt": "2026-02-14T10:00:00Z"
      },
      {
        "n": 1,
        "address": "RChangeAddress789...",
        "amount": 50.499,
        "scriptPubKey": "...",
        "spent": false
      }
    ],
    "type": "asset_transfer",
    "assetData": {
      "assetId": "ASSET_ID_123",
      "operation": "transfer",
      "amount": 1
    }
  }
}
```

### List Transactions

Get a list of recent transactions.

**Endpoint**: `GET /transactions`

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `type` - Filter by type: `standard`, `asset_create`, `asset_transfer`
- `blockHeight` - Filter by block height
- `since` - Filter by timestamp (ISO 8601)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "txid": "txid123...",
      "blockHeight": 1234567,
      "timestamp": "2026-02-13T21:51:13Z",
      "confirmations": 100,
      "size": 250,
      "fee": 0.001,
      "type": "asset_transfer",
      "inputCount": 1,
      "outputCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10000000,
    "pages": 500000,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Address Endpoints

### Get Address Details

Get detailed information about a specific address.

**Endpoint**: `GET /addresses/:address`

**Parameters**:
- `address` (path) - Raptoreum address

**Response**:
```json
{
  "success": true,
  "data": {
    "address": "RAddress123...",
    "balance": 1234.567,
    "totalReceived": 5000.0,
    "totalSent": 3765.433,
    "firstSeenBlock": 1000000,
    "lastSeenBlock": 1234567,
    "firstSeenAt": "2025-01-01T00:00:00Z",
    "lastSeenAt": "2026-02-13T21:51:13Z",
    "transactionCount": 156,
    "assetBalances": [
      {
        "assetId": "FUNGIBLE_TOKEN_1",
        "balance": 1000.5
      },
      {
        "assetId": "NFT_COLLECTION",
        "assets": ["NFT_1", "NFT_2", "NFT_3"]
      }
    ],
    "assetsCreated": 25,
    "assetsOwned": 3,
    "isCreator": true,
    "profile": {
      "username": "artist123",
      "displayName": "Artist Name",
      "bio": "Digital artist creating unique NFTs",
      "avatar": "QmAvatarHash...",
      "website": "https://artist.com",
      "social": {
        "twitter": "artist123",
        "discord": "artist#1234"
      },
      "verified": true
    }
  }
}
```

### Get Address Transactions

Get transaction history for a specific address.

**Endpoint**: `GET /addresses/:address/transactions`

**Parameters**:
- `address` (path) - Raptoreum address

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `type` - Filter by type: `sent`, `received`, `all` (default: `all`)

**Response**: Same structure as List Transactions

### Get Address Assets

Get all assets associated with a specific address (either as owner or creator).

**Endpoint**: `GET /addresses/:address/assets`

**Parameters**:
- `address` (path) - Raptoreum address

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `type` - Filter by asset type: `fungible`, `non-fungible` (optional)

**Description**: Returns assets where the address is either the current owner or the creator of the asset.

**Response**: Same structure as List Assets

---

## Search Endpoints

### Universal Search

Search across all resources (blocks, transactions, addresses, assets).

**Endpoint**: `GET /search`

**Query Parameters**:
- `q` - Search query (required)
- `type` - Filter by type: `all`, `block`, `transaction`, `address`, `asset` (default: `all`)
- `limit` - Items per page (default: 10, max: 50)

**Response**:
```json
{
  "success": true,
  "data": {
    "query": "cool nft",
    "results": {
      "assets": [
        {
          "assetId": "ASSET_ID_123",
          "name": "Cool NFT #1",
          "type": "non-fungible",
          "creator": "RCreatorAddress123...",
          "imageUrl": "https://ipfs.io/ipfs/QmImageHash123...",
          "relevance": 0.95
        }
      ],
      "blocks": [],
      "transactions": [],
      "addresses": []
    },
    "totalResults": 1
  }
}
```

### Search Assets

Search for assets by name, description, or tags.

**Endpoint**: `GET /search/assets`

**Query Parameters**:
- `q` - Search query (required)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `type` - Filter by type: `fungible` or `non-fungible`
- `category` - Filter by category
- `sort` - Sort by: `relevance`, `created`, `name`, `views` (default: `relevance`)

**Response**: Same structure as List Assets with relevance scores

---

## Statistics Endpoints

### Get Global Statistics

Get global statistics about the blockchain and assets.

**Endpoint**: `GET /stats/global`

**Response**:
```json
{
  "success": true,
  "data": {
    "blockchain": {
      "totalBlocks": 1234567,
      "totalTransactions": 10000000,
      "averageBlockTime": 60,
      "difficulty": 123456.789,
      "hashrate": "1.5 TH/s"
    },
    "assets": {
      "totalAssets": 5000,
      "fungibleAssets": 1200,
      "nonFungibleAssets": 3800,
      "totalTransfers": 25000,
      "totalCreators": 500
    },
    "network": {
      "peers": 150,
      "syncProgress": 100,
      "lastBlockTime": "2026-02-13T21:51:13Z"
    }
  }
}
```

### Get Asset Statistics

Get detailed statistics about assets.

**Endpoint**: `GET /stats/assets`

**Query Parameters**:
- `period` - Time period: `24h`, `7d`, `30d`, `all` (default: `all`)

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "newAssets": 50,
    "totalTransfers": 250,
    "activeAssets": 150,
    "topAssets": [
      {
        "assetId": "POPULAR_NFT_1",
        "name": "Popular NFT #1",
        "transfers": 25,
        "views": 5000
      }
    ],
    "topCreators": [
      {
        "address": "RTopCreator123...",
        "username": "topartist",
        "assetsCreated": 100,
        "totalTransfers": 500
      }
    ]
  }
}
```

### Get Creator Statistics

Get statistics about a specific creator.

**Endpoint**: `GET /stats/creators/:address`

**Parameters**:
- `address` (path) - Creator address

**Response**:
```json
{
  "success": true,
  "data": {
    "address": "RCreatorAddress123...",
    "assetsCreated": 100,
    "fungibleAssets": 20,
    "nonFungibleAssets": 80,
    "totalTransfers": 500,
    "totalViews": 50000,
    "totalFavorites": 1000,
    "firstAssetCreated": "2025-06-01T00:00:00Z",
    "lastAssetCreated": "2026-02-13T21:51:13Z",
    "topAssets": [
      {
        "assetId": "TOP_ASSET_1",
        "name": "Top Asset #1",
        "transfers": 50,
        "views": 10000
      }
    ]
  }
}
```

---

## Health Endpoints

### Basic Health Check

Check if the API is operational.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-13T21:51:13Z",
    "uptime": 3600000,
    "version": "1.0.0"
  }
}
```

### Detailed Health Check

Check the health of all system components.

**Endpoint**: `GET /health/detailed`

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-13T21:51:13Z",
    "components": {
      "api": {
        "status": "healthy",
        "uptime": 3600000,
        "requestsPerMinute": 150
      },
      "blockchain": {
        "status": "healthy",
        "connected": true,
        "synced": true,
        "currentBlock": 1234567,
        "behindBlocks": 0
      },
      "database": {
        "status": "healthy",
        "connected": true,
        "responseTime": 5
      },
      "cache": {
        "status": "healthy",
        "connected": true,
        "memoryUsage": 45.5,
        "hitRate": 85.2
      },
      "ipfs": {
        "status": "healthy",
        "connected": true,
        "peers": 50
      }
    }
  }
}
```

### Component-Specific Health Checks

Check the health of specific components.

**Blockchain**: `GET /health/blockchain`
**Database**: `GET /health/database`
**Cache**: `GET /health/cache`
**IPFS**: `GET /health/ipfs`

---

## Export Endpoints

The export system provides cryptographically signed, blockchain-verified exports for legal compliance and data verification. All exports cost $2.00 USD (paid in Litecoin) and are tokenized on the Raptoreum blockchain.

For comprehensive documentation, see [EXPORTS.md](EXPORTS.md).

### POST /api/export/request

Initiate a new export request.

**Authentication:** None (payment required)

**Request Body:**
```json
{
  "type": "asset|address|multi|legal|provenance",
  "assetId": "ASSET_NAME",           // For asset/provenance types
  "address": "RAddress...",           // For address type
  "assetIds": ["ASSET1", "ASSET2"],  // For multi type
  "includeTransactions": true,
  "includeAddresses": true,
  "includeMedia": false,              // Download IPFS content
  "retention": 604800,                // Seconds (7 days default)
  "format": "zip",                    // Always zip containing all formats
  "legalInfo": {                      // Required for legal type
    "caseReference": "Case #2024-1234",
    "court": "Superior Court of...",
    "purpose": "Evidence for trademark dispute"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "exp_abc123def456",
    "paymentAddress": "ltc1q...",
    "paymentAmount": {
      "usd": 2.00,
      "ltc": "0.02847391",
      "rate": 70.32,
      "validFor": 1800
    },
    "expiresAt": "2026-02-14T12:30:00Z",
    "limits": {
      "maxAssets": 1000,
      "maxTransactions": 10000,
      "maxFileSize": "100MB"
    }
  }
}
```

### GET /api/export/status/:exportId

Check export processing status.

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "exp_abc123def456",
    "status": "pending_payment|processing|completed|failed",
    "queuePosition": 3,
    "estimatedTime": "2-3 minutes",
    "paymentStatus": "confirmed",
    "progress": {
      "step": "generating_pdf",
      "percentage": 75
    },
    "downloadUrl": "https://assets.raptoreum.com/download/...",
    "verification": {
      "assetName": "RTM_EXPORTS/ASSET_20260214_a3f2c1b9",
      "txid": "abc123...",
      "ipfsHash": "QmX...",
      "signature": "3045..."
    },
    "expiresAt": "2026-02-21T12:00:00Z"
  }
}
```

### GET /api/export/download/:exportId

Download completed export (requires valid exportId).

**Response:** ZIP file download

### GET /api/export/verify/:assetName

Verify a tokenized export.

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "assetName": "RTM_EXPORTS/ASSET_20260214_a3f2c1b9",
    "createdAt": "2026-02-14T12:00:00Z",
    "exportType": "asset",
    "blockHeight": 123456,
    "txid": "abc123...",
    "ipfsHash": "QmX...",
    "fileHash": "sha256:...",
    "signatureValid": true,
    "verification": {
      "onChain": "https://explorer.raptoreum.com/tx/abc123...",
      "ipfs": "https://ipfs.io/ipfs/QmX...",
      "blockExplorer": "https://assets.raptoreum.com/verify/..."
    }
  }
}
```

### POST /api/export/webhook

Litecoin payment webhook (internal use).

---

## Code Examples

### JavaScript (Node.js)

```javascript
// Using fetch API
const API_BASE_URL = 'https://assets.raptoreum.com/api/v1';

// Get blockchain info
async function getBlockchainInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/blockchain/info`);
    const data = await response.json();
    
    if (data.success) {
      console.log('Blockchain Info:', data.data);
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Get asset details with authentication
async function getAssetDetails(assetId, apiKey) {
  try {
    const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    if (data.success) {
      console.log('Asset Details:', data.data);
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Search assets with pagination
async function searchAssets(query, page = 1) {
  try {
    const params = new URLSearchParams({
      q: query,
      page: page,
      limit: 20,
      sort: 'relevance'
    });
    
    const response = await fetch(`${API_BASE_URL}/search/assets?${params}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`Found ${data.pagination.total} assets`);
      data.data.forEach(asset => {
        console.log(`- ${asset.name} (${asset.assetId})`);
      });
      
      // Load next page if available
      if (data.pagination.hasNext) {
        await searchAssets(query, page + 1);
      }
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// Using axios library (recommended)
const axios = require('axios');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Add API key to all requests
api.interceptors.request.use(config => {
  const apiKey = process.env.RTM_API_KEY;
  if (apiKey) {
    config.headers.Authorization = `Bearer ${apiKey}`;
  }
  return config;
});

// Handle rate limiting
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.data.error.retryAfter;
      console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    }
    return Promise.reject(error);
  }
);

// Example usage
async function main() {
  try {
    // Get blockchain info
    const blockchainInfo = await api.get('/blockchain/info');
    console.log('Current block:', blockchainInfo.data.data.blocks);
    
    // List recent assets
    const assets = await api.get('/assets', {
      params: {
        limit: 10,
        sort: 'created',
        order: 'desc'
      }
    });
    console.log(`Found ${assets.data.pagination.total} total assets`);
    
    // Get specific asset
    const assetId = 'ASSET_ID_123';
    const asset = await api.get(`/assets/${assetId}`);
    console.log('Asset:', asset.data.data.name);
    
    // Get transfer history
    const transfers = await api.get(`/assets/${assetId}/transfers`);
    console.log(`${transfers.data.pagination.total} transfers`);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
```

### JavaScript (Browser)

```javascript
// Using fetch in browser
class RaptoreumAPI {
  constructor(apiKey = null) {
    this.baseURL = 'https://assets.raptoreum.com/api/v1';
    this.apiKey = apiKey;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  // Blockchain methods
  async getBlockchainInfo() {
    return this.request('/blockchain/info');
  }
  
  async getBlock(height) {
    return this.request(`/blockchain/blocks/${height}`);
  }
  
  // Asset methods
  async getAssets(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/assets?${query}`);
  }
  
  async getAsset(assetId, verify = false) {
    const query = verify ? '?verify=true' : '';
    return this.request(`/assets/${assetId}${query}`);
  }
  
  async getAssetTransfers(assetId, page = 1) {
    return this.request(`/assets/${assetId}/transfers?page=${page}`);
  }
  
  // Search methods
  async searchAssets(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      ...options
    }).toString();
    return this.request(`/search/assets?${params}`);
  }
  
  // Address methods
  async getAddress(address) {
    return this.request(`/addresses/${address}`);
  }
  
  async getAddressTransactions(address, page = 1) {
    return this.request(`/addresses/${address}/transactions?page=${page}`);
  }
}

// Usage example
const api = new RaptoreumAPI('your_api_key_here');

// Load and display assets
async function loadAssets() {
  try {
    const result = await api.getAssets({
      limit: 12,
      featured: true,
      sort: 'created',
      order: 'desc'
    });
    
    const assetsContainer = document.getElementById('assets');
    result.data.forEach(asset => {
      const card = document.createElement('div');
      card.className = 'asset-card';
      card.innerHTML = `
        <img src="${asset.metadata.imageUrl}" alt="${asset.name}">
        <h3>${asset.name}</h3>
        <p>Creator: ${asset.creator}</p>
        <p>Transfers: ${asset.transferCount}</p>
      `;
      assetsContainer.appendChild(card);
    });
  } catch (error) {
    console.error('Failed to load assets:', error);
  }
}

// Search with autocomplete
async function handleSearch(query) {
  if (query.length < 3) return;
  
  try {
    const result = await api.searchAssets(query, {
      limit: 5,
      sort: 'relevance'
    });
    
    displaySearchResults(result.data);
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// Real-time updates
async function updateBlockchainInfo() {
  try {
    const result = await api.getBlockchainInfo();
    document.getElementById('current-block').textContent = 
      result.data.blocks.toLocaleString();
    document.getElementById('sync-status').textContent = 
      result.data.syncStatus.synced ? 'Synced' : 'Syncing...';
  } catch (error) {
    console.error('Failed to update blockchain info:', error);
  }
}

// Update every 30 seconds
setInterval(updateBlockchainInfo, 30000);
updateBlockchainInfo();
```

### Python

```python
import requests
import time
from typing import Optional, Dict, List

class RaptoreumAPI:
    """Python client for Raptoreum Asset Explorer API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.base_url = 'https://assets.raptoreum.com/api/v1'
        self.api_key = api_key
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {api_key}'
            })
        
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """Make API request with error handling"""
        url = f'{self.base_url}{endpoint}'
        
        try:
            response = self.session.request(method, url, **kwargs)
            data = response.json()
            
            if response.status_code == 429:
                retry_after = data['error'].get('retryAfter', 60)
                print(f'Rate limited. Waiting {retry_after} seconds...')
                time.sleep(retry_after)
                return self._request(method, endpoint, **kwargs)
            
            response.raise_for_status()
            return data
            
        except requests.exceptions.RequestException as e:
            print(f'API request failed: {e}')
            raise
    
    # Blockchain methods
    def get_blockchain_info(self) -> Dict:
        """Get current blockchain information"""
        return self._request('GET', '/blockchain/info')
    
    def get_block(self, height: int) -> Dict:
        """Get block by height"""
        return self._request('GET', f'/blockchain/blocks/{height}')
    
    def get_recent_blocks(self, page: int = 1, limit: int = 20) -> Dict:
        """Get recent blocks"""
        params = {'page': page, 'limit': limit}
        return self._request('GET', '/blockchain/blocks', params=params)
    
    # Asset methods
    def get_assets(self, **kwargs) -> Dict:
        """
        Get assets with filtering
        
        Args:
            page: Page number
            limit: Items per page
            type: 'fungible' or 'non-fungible'
            creator: Creator address
            sort: Sort field
            order: 'asc' or 'desc'
            featured: Filter featured assets
        """
        return self._request('GET', '/assets', params=kwargs)
    
    def get_asset(self, asset_id: str, verify: bool = False) -> Dict:
        """Get asset details"""
        params = {'verify': str(verify).lower()} if verify else {}
        return self._request('GET', f'/assets/{asset_id}', params=params)
    
    def get_asset_transfers(self, asset_id: str, page: int = 1, limit: int = 20) -> Dict:
        """Get asset transfer history"""
        params = {'page': page, 'limit': limit}
        return self._request('GET', f'/assets/{asset_id}/transfers', params=params)
    
    def get_assets_by_creator(self, address: str, **kwargs) -> Dict:
        """Get assets by creator"""
        return self._request('GET', f'/assets/creator/{address}', params=kwargs)
    
    # Transaction methods
    def get_transaction(self, txid: str) -> Dict:
        """Get transaction details"""
        return self._request('GET', f'/transactions/{txid}')
    
    def get_transactions(self, **kwargs) -> Dict:
        """Get transactions with filtering"""
        return self._request('GET', '/transactions', params=kwargs)
    
    # Address methods
    def get_address(self, address: str) -> Dict:
        """Get address details"""
        return self._request('GET', f'/addresses/{address}')
    
    def get_address_transactions(self, address: str, **kwargs) -> Dict:
        """Get address transaction history"""
        return self._request('GET', f'/addresses/{address}/transactions', params=kwargs)
    
    def get_address_assets(self, address: str, **kwargs) -> Dict:
        """Get address assets"""
        return self._request('GET', f'/addresses/{address}/assets', params=kwargs)
    
    # Search methods
    def search(self, query: str, type: str = 'all', limit: int = 10) -> Dict:
        """Universal search"""
        params = {'q': query, 'type': type, 'limit': limit}
        return self._request('GET', '/search', params=params)
    
    def search_assets(self, query: str, **kwargs) -> Dict:
        """Search assets"""
        params = {'q': query, **kwargs}
        return self._request('GET', '/search/assets', params=params)
    
    # Statistics methods
    def get_global_stats(self) -> Dict:
        """Get global statistics"""
        return self._request('GET', '/stats/global')
    
    def get_asset_stats(self, period: str = 'all') -> Dict:
        """Get asset statistics"""
        params = {'period': period}
        return self._request('GET', '/stats/assets', params=params)
    
    def get_creator_stats(self, address: str) -> Dict:
        """Get creator statistics"""
        return self._request('GET', f'/stats/creators/{address}')
    
    # Health methods
    def health_check(self) -> Dict:
        """Basic health check"""
        return self._request('GET', '/health')
    
    def detailed_health_check(self) -> Dict:
        """Detailed health check"""
        return self._request('GET', '/health/detailed')

# Example usage
def main():
    # Initialize API client
    api = RaptoreumAPI(api_key='your_api_key_here')
    
    # Get blockchain info
    blockchain_info = api.get_blockchain_info()
    print(f"Current block: {blockchain_info['data']['blocks']}")
    
    # Get featured assets
    assets = api.get_assets(
        featured=True,
        limit=10,
        sort='views',
        order='desc'
    )
    
    print(f"\nFeatured Assets ({assets['pagination']['total']} total):")
    for asset in assets['data']:
        print(f"- {asset['name']} ({asset['type']})")
        print(f"  Creator: {asset['creator']}")
        print(f"  Transfers: {asset['transferCount']}")
    
    # Search for assets
    search_results = api.search_assets('digital art', limit=5)
    print(f"\nSearch Results ({search_results['pagination']['total']} found):")
    for asset in search_results['data']:
        print(f"- {asset['name']}")
    
    # Get specific asset with transfer history
    asset_id = 'ASSET_ID_123'
    asset = api.get_asset(asset_id, verify=True)
    print(f"\nAsset: {asset['data']['name']}")
    
    transfers = api.get_asset_transfers(asset_id)
    print(f"Transfer History ({transfers['pagination']['total']} transfers):")
    for transfer in transfers['data']:
        print(f"  {transfer['timestamp']}: {transfer['from'][:10]}... -> {transfer['to'][:10]}...")
    
    # Get address info
    address = 'RAddress123...'
    address_info = api.get_address(address)
    print(f"\nAddress: {address}")
    print(f"Balance: {address_info['data']['balance']} RTM")
    print(f"Transactions: {address_info['data']['transactionCount']}")
    print(f"Assets Created: {address_info['data']['assetsCreated']}")
    
    # Get statistics
    stats = api.get_global_stats()
    print("\nGlobal Statistics:")
    print(f"  Total Assets: {stats['data']['assets']['totalAssets']}")
    print(f"  Total Transfers: {stats['data']['assets']['totalTransfers']}")
    print(f"  Total Creators: {stats['data']['assets']['totalCreators']}")

if __name__ == '__main__':
    main()
```

### cURL

```bash
#!/bin/bash

# Base URL
API_BASE_URL="https://assets.raptoreum.com/api/v1"

# API key (optional)
API_KEY="your_api_key_here"

# Helper function for API requests
api_request() {
    local endpoint=$1
    local method=${2:-GET}
    
    if [ -n "$API_KEY" ]; then
        curl -X $method \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            "$API_BASE_URL$endpoint"
    else
        curl -X $method \
            -H "Content-Type: application/json" \
            "$API_BASE_URL$endpoint"
    fi
}

# Get blockchain info
echo "Blockchain Info:"
api_request "/blockchain/info" | jq '.'

# Get recent blocks
echo -e "\nRecent Blocks:"
api_request "/blockchain/blocks?limit=5" | jq '.data[] | {height, hash, timestamp, transactionCount}'

# Get specific block
echo -e "\nBlock 1234567:"
api_request "/blockchain/blocks/1234567" | jq '.'

# List assets
echo -e "\nFeatured Assets:"
api_request "/assets?featured=true&limit=10" | jq '.data[] | {assetId, name, creator, transferCount}'

# Get asset details
echo -e "\nAsset Details:"
api_request "/assets/ASSET_ID_123" | jq '.'

# Get asset transfers
echo -e "\nAsset Transfers:"
api_request "/assets/ASSET_ID_123/transfers" | jq '.data[] | {timestamp, from, to}'

# Get assets by creator
echo -e "\nAssets by Creator:"
api_request "/assets/creator/RCreatorAddress123..." | jq '.data[] | {assetId, name, createdAt}'

# Get transaction
echo -e "\nTransaction Details:"
api_request "/transactions/txid123..." | jq '.'

# Get address info
echo -e "\nAddress Info:"
api_request "/addresses/RAddress123..." | jq '.'

# Search assets
echo -e "\nSearch Results:"
api_request "/search/assets?q=digital%20art&limit=5" | jq '.data[] | {assetId, name, relevance}'

# Universal search
echo -e "\nUniversal Search:"
api_request "/search?q=1234567" | jq '.'

# Get global statistics
echo -e "\nGlobal Statistics:"
api_request "/stats/global" | jq '.'

# Get asset statistics
echo -e "\nAsset Statistics (24h):"
api_request "/stats/assets?period=24h" | jq '.'

# Get creator statistics
echo -e "\nCreator Statistics:"
api_request "/stats/creators/RCreatorAddress123..." | jq '.'

# Health check
echo -e "\nHealth Check:"
api_request "/health" | jq '.'

# Detailed health check
echo -e "\nDetailed Health Check:"
api_request "/health/detailed" | jq '.'

# Example: Pagination through results
echo -e "\nPaginating through assets:"
page=1
while true; do
    response=$(api_request "/assets?page=$page&limit=20")
    has_next=$(echo $response | jq -r '.pagination.hasNext')
    
    echo "Page $page:"
    echo $response | jq '.data[] | {assetId, name}'
    
    if [ "$has_next" = "false" ]; then
        break
    fi
    
    ((page++))
done

# Example: With query parameters
curl -G "$API_BASE_URL/assets" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    --data-urlencode "type=non-fungible" \
    --data-urlencode "sort=created" \
    --data-urlencode "order=desc" \
    --data-urlencode "limit=10" \
    | jq '.'

# Example: Handle rate limiting
api_request_with_retry() {
    local endpoint=$1
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        response=$(api_request "$endpoint")
        status=$(echo $response | jq -r '.success')
        
        if [ "$status" = "true" ]; then
            echo $response
            return 0
        fi
        
        error_code=$(echo $response | jq -r '.error.code')
        if [ "$error_code" = "RATE_LIMIT_EXCEEDED" ]; then
            retry_after=$(echo $response | jq -r '.error.retryAfter')
            echo "Rate limited. Waiting $retry_after seconds..." >&2
            sleep $retry_after
            ((retry++))
        else
            echo "Error: $error_code" >&2
            echo $response
            return 1
        fi
    done
    
    echo "Max retries exceeded" >&2
    return 1
}

# Example: Download asset metadata
download_asset_metadata() {
    local asset_id=$1
    local output_file="${asset_id}_metadata.json"
    
    echo "Downloading metadata for $asset_id..."
    api_request "/assets/$asset_id" > $output_file
    
    if [ $? -eq 0 ]; then
        echo "Saved to $output_file"
        
        # Download IPFS image
        image_url=$(jq -r '.data.metadata.imageUrl' $output_file)
        if [ "$image_url" != "null" ]; then
            image_file="${asset_id}_image.jpg"
            echo "Downloading image from $image_url..."
            curl -o $image_file "$image_url"
            echo "Saved to $image_file"
        fi
    fi
}

# Usage
download_asset_metadata "ASSET_ID_123"
```

---

## Best Practices

### 1. Rate Limiting

**Always respect rate limits:**
- Implement exponential backoff for retries
- Cache responses when possible
- Use API keys for higher limits
- Monitor rate limit headers
- Batch requests when possible

```javascript
// Example: Exponential backoff
async function requestWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        const backoff = Math.min(1000 * Math.pow(2, i), 60000);
        await sleep(Math.max(retryAfter * 1000, backoff));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

### 2. Caching

**Implement client-side caching:**
- Cache static data (asset metadata, block data)
- Use appropriate cache TTLs
- Invalidate cache on updates
- Consider using ETags

```javascript
// Example: Simple cache implementation
class CachedAPI extends RaptoreumAPI {
  constructor(apiKey) {
    super(apiKey);
    this.cache = new Map();
    this.cacheTTL = {
      '/blockchain/info': 30000,      // 30 seconds
      '/assets/:id': 300000,          // 5 minutes
      '/blocks/:height': 3600000      // 1 hour (immutable)
    };
  }
  
  async request(endpoint, options = {}) {
    const cacheKey = `${endpoint}${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.getCacheTTL(endpoint)) {
      return cached.data;
    }
    
    const data = await super.request(endpoint, options);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  getCacheTTL(endpoint) {
    for (const [pattern, ttl] of Object.entries(this.cacheTTL)) {
      if (endpoint.match(new RegExp(pattern.replace(':id', '[^/]+')))) {
        return ttl;
      }
    }
    return 60000; // Default 1 minute
  }
}
```

### 3. Error Handling

**Handle errors gracefully:**
- Always check response status
- Provide meaningful error messages
- Implement retry logic for transient errors
- Log errors for debugging

```javascript
// Example: Comprehensive error handling
class APIError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function safeApiRequest(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new APIError(
        data.error.code,
        data.error.message,
        data.error.details
      );
    }
    
    return data.data;
  } catch (error) {
    if (error instanceof APIError) {
      // Handle specific API errors
      switch (error.code) {
        case 'RATE_LIMIT_EXCEEDED':
          console.log('Rate limited, waiting...');
          await sleep(60000);
          return safeApiRequest(endpoint);
        
        case 'NOT_FOUND':
          console.log('Resource not found');
          return null;
        
        default:
          console.error('API error:', error.message);
          throw error;
      }
    } else {
      // Handle network errors
      console.error('Network error:', error);
      throw error;
    }
  }
}
```

### 4. Pagination

**Handle pagination efficiently:**
- Always specify reasonable page sizes
- Use cursor-based pagination when available
- Implement virtual scrolling for large lists
- Show loading indicators

```javascript
// Example: Fetch all pages
async function fetchAllAssets(filters = {}) {
  const allAssets = [];
  let page = 1;
  let hasNext = true;
  
  while (hasNext) {
    const result = await api.getAssets({
      ...filters,
      page,
      limit: 100 // Max limit for efficiency
    });
    
    allAssets.push(...result.data);
    hasNext = result.pagination.hasNext;
    page++;
    
    // Rate limiting: wait between pages
    if (hasNext) {
      await sleep(100);
    }
  }
  
  return allAssets;
}
```

### 5. Data Verification

**For critical operations, verify data from blockchain:**
- Use `verify=true` parameter for asset ownership
- Cross-reference transaction confirmations
- Don't trust cached data for financial operations
- Implement checksums for data integrity

```javascript
// Example: Verify asset ownership
async function verifyAssetOwnership(assetId, expectedOwner) {
  // Get asset with blockchain verification
  const asset = await api.getAsset(assetId, true);
  
  if (asset.meta.blockchainVerified && 
      asset.data.currentOwner === expectedOwner) {
    return true;
  }
  
  // If not verified or mismatch, don't proceed
  console.warn('Asset ownership verification failed');
  return false;
}
```

### 6. Security

**Follow security best practices:**
- Never expose API keys in client-side code
- Use environment variables for sensitive data
- Implement proper CORS headers
- Sanitize user input before API calls
- Use HTTPS for all requests

```javascript
// Example: Secure API key management (backend only)
// .env file
RTM_API_KEY=your_secret_api_key_here

// server.js
require('dotenv').config();
const apiKey = process.env.RTM_API_KEY;

// Never do this in frontend:
// const apiKey = 'your_secret_api_key_here'; // ❌ BAD!

// Instead, proxy through your backend:
// frontend -> your backend -> RTM API
```

### 7. Performance Optimization

**Optimize for performance:**
- Batch requests when possible
- Use appropriate page sizes
- Implement debouncing for search
- Lazy load images and metadata
- Use CDN for static assets

```javascript
// Example: Debounced search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const searchAssets = debounce(async (query) => {
  if (query.length < 3) return;
  const results = await api.searchAssets(query);
  displayResults(results.data);
}, 300);

// Usage
searchInput.addEventListener('input', (e) => {
  searchAssets(e.target.value);
});
```

### 8. Monitoring

**Monitor API usage:**
- Track request counts and patterns
- Monitor error rates
- Set up alerts for rate limiting
- Log slow requests

```javascript
// Example: Request monitoring
class MonitoredAPI extends RaptoreumAPI {
  constructor(apiKey) {
    super(apiKey);
    this.metrics = {
      totalRequests: 0,
      errors: 0,
      slowRequests: 0
    };
  }
  
  async request(endpoint, options = {}) {
    this.metrics.totalRequests++;
    const startTime = Date.now();
    
    try {
      const result = await super.request(endpoint, options);
      const duration = Date.now() - startTime;
      
      if (duration > 5000) {
        this.metrics.slowRequests++;
        console.warn(`Slow request: ${endpoint} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      errorRate: (this.metrics.errors / this.metrics.totalRequests * 100).toFixed(2) + '%'
    };
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-13
**Author**: Salty-Dragon
**Status**: Complete - Ready for Implementation