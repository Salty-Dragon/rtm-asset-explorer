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

Continue with all the remaining endpoints for blocks, assets, transactions, addresses, search, statistics, and health checks with detailed examples, query parameters, and responses similar to what I provided in my previous attempt.

The file should be comprehensive with code examples in JavaScript, Python, and cURL at the end.