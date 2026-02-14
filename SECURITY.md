# Security Documentation

## Overview

Security is paramount for the Raptoreum Asset Explorer. This document outlines security measures, best practices, and procedures to protect the system, user data, and blockchain integrity.

## Table of Contents

1. [Input Validation](#input-validation)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Key Management](#api-key-management)
4. [Rate Limiting](#rate-limiting)
5. [CORS Configuration](#cors-configuration)
6. [Audit Logging](#audit-logging)
7. [Data Verification](#data-verification)
8. [Export System Security](#export-system-security)
9. [Security Headers](#security-headers)
10. [Sensitive Data Protection](#sensitive-data-protection)
11. [Incident Response](#incident-response)
12. [Security Best Practices](#security-best-practices)
13. [Vulnerability Management](#vulnerability-management)

---

## Input Validation

### Validation Rules

**Always validate and sanitize all user input** to prevent injection attacks and ensure data integrity.

#### Address Validation

```javascript
// lib/validators.ts
export function validateRaptoreumAddress(address: string): boolean {
  // Raptoreum addresses start with 'R' and are 34 characters long
  const addressRegex = /^R[A-Za-z0-9]{33}$/;
  
  if (!addressRegex.test(address)) {
    return false;
  }
  
  // Additional checksum validation can be added here
  return true;
}

// Usage in API
app.get('/addresses/:address', (req, res) => {
  const { address } = req.params;
  
  if (!validateRaptoreumAddress(address)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid Raptoreum address format'
      }
    });
  }
  
  // Proceed with query
});
```

#### Transaction ID Validation

```javascript
export function validateTxid(txid: string): boolean {
  // Transaction IDs are 64-character hex strings
  const txidRegex = /^[a-f0-9]{64}$/i;
  return txidRegex.test(txid);
}
```

#### Block Hash/Height Validation

```javascript
export function validateBlockHash(hash: string): boolean {
  // Block hashes are 64-character hex strings
  const hashRegex = /^[a-f0-9]{64}$/i;
  return hashRegex.test(hash);
}

export function validateBlockHeight(height: any): boolean {
  const heightNum = parseInt(height, 10);
  return Number.isInteger(heightNum) && heightNum >= 0 && heightNum < 10000000;
}
```

#### Asset ID Validation

```javascript
export function validateAssetId(assetId: string): boolean {
  // Asset IDs follow a specific format
  const assetIdRegex = /^[A-Z0-9_]{3,30}$/;
  return assetIdRegex.test(assetId);
}
```

#### Query Parameter Validation

```javascript
// middleware/validation.js
import { z } from 'zod';

// Pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Asset filter schema
const assetFilterSchema = z.object({
  type: z.enum(['all', 'fungible', 'non-fungible']).optional(),
  sort: z.enum(['created', 'name', 'transfers', 'views']).default('created'),
  order: z.enum(['asc', 'desc']).default('desc'),
  featured: z.coerce.boolean().optional(),
  creator: z.string().refine(validateRaptoreumAddress).optional(),
  category: z.string().max(50).optional(),
  tag: z.string().max(30).optional(),
});

// Validation middleware
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated;
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors
        }
      });
    }
  };
}

// Usage
app.get('/assets', 
  validateQuery(paginationSchema.merge(assetFilterSchema)),
  assetsController.list
);
```

### SQL/NoSQL Injection Prevention

```javascript
// NEVER concatenate user input into queries
// ❌ BAD
db.collection('assets').find({ assetId: req.params.id });

// ✅ GOOD - Use parameterized queries
db.collection('assets').find({ assetId: { $eq: req.params.id } });

// Use Mongoose with schema validation
const AssetSchema = new mongoose.Schema({
  assetId: { 
    type: String, 
    required: true,
    validate: {
      validator: validateAssetId,
      message: 'Invalid asset ID format'
    }
  },
  // ... other fields
});
```

### XSS Prevention

```javascript
// Sanitize HTML content
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: []
  });
}

// Sanitize user-provided metadata
export function sanitizeMetadata(metadata: any): any {
  return {
    name: sanitizeHTML(metadata.name || ''),
    description: sanitizeHTML(metadata.description || ''),
    // Validate URLs
    externalUrl: isValidURL(metadata.externalUrl) ? metadata.externalUrl : null,
    // ... other fields
  };
}
```

### Path Traversal Prevention

```javascript
// NEVER use user input directly in file paths
// ❌ BAD
fs.readFile(`./uploads/${req.params.filename}`);

// ✅ GOOD - Validate and sanitize
import path from 'path';

export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const sanitized = path.basename(filename);
  // Only allow alphanumeric, dash, underscore, and dot
  return sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
}
```

---

## Authentication & Authorization

### API Key Authentication

```javascript
// middleware/auth.js
import crypto from 'crypto';
import { ApiKey } from '../models/ApiKey';

export async function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Allow public access but with lower rate limits
    req.authenticated = false;
    return next();
  }
  
  const apiKey = authHeader.slice(7);
  
  // Hash the provided key
  const keyHash = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
  
  try {
    const keyRecord = await ApiKey.findOne({ 
      key: keyHash, 
      active: true 
    });
    
    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key'
        }
      });
    }
    
    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key expired'
        }
      });
    }
    
    // Attach key info to request
    req.authenticated = true;
    req.apiKey = keyRecord;
    req.rateLimit = keyRecord.rateLimit;
    
    // Update last used
    keyRecord.lastUsed = new Date();
    keyRecord.totalRequests += 1;
    await keyRecord.save();
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed'
      }
    });
  }
}
```

### Role-Based Access Control (RBAC)

```javascript
// For future admin features
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.authenticated) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    if (!req.apiKey.roles || !req.apiKey.roles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }
    
    next();
  };
}

// Usage
app.post('/admin/assets/:id/feature', 
  authenticateApiKey, 
  requireRole('admin'),
  adminController.featureAsset
);
```

---

## API Key Management

### Key Generation

```javascript
// services/apiKeyService.js
import crypto from 'crypto';
import { ApiKey } from '../models/ApiKey';

export async function generateApiKey(data) {
  // Generate secure random key
  const key = crypto.randomBytes(32).toString('hex');
  
  // Hash the key for storage
  const keyHash = crypto
    .createHash('sha256')
    .update(key)
    .digest('hex');
  
  // Store only the hash
  const apiKey = await ApiKey.create({
    key: keyHash,
    keyPrefix: key.slice(0, 8), // For display purposes
    name: data.name,
    email: data.email,
    organization: data.organization,
    tier: data.tier || 'free',
    rateLimit: data.tier === 'premium' ? 1000 : 100,
    active: true,
    expiresAt: data.expiresAt || null
  });
  
  // Return the plain key only once
  return {
    key: key, // User must save this
    keyId: apiKey._id,
    keyPrefix: apiKey.keyPrefix,
    tier: apiKey.tier,
    rateLimit: apiKey.rateLimit
  };
}
```

### Key Rotation

```javascript
export async function rotateApiKey(keyId) {
  const oldKey = await ApiKey.findById(keyId);
  
  if (!oldKey) {
    throw new Error('API key not found');
  }
  
  // Generate new key
  const newKeyData = await generateApiKey({
    name: oldKey.name,
    email: oldKey.email,
    organization: oldKey.organization,
    tier: oldKey.tier,
    expiresAt: oldKey.expiresAt
  });
  
  // Deactivate old key (with grace period)
  oldKey.active = false;
  oldKey.rotatedTo = newKeyData.keyId;
  await oldKey.save();
  
  return newKeyData;
}
```

### Key Revocation

```javascript
export async function revokeApiKey(keyId, reason) {
  const apiKey = await ApiKey.findById(keyId);
  
  if (!apiKey) {
    throw new Error('API key not found');
  }
  
  apiKey.active = false;
  apiKey.revokedAt = new Date();
  apiKey.revokedReason = reason;
  await apiKey.save();
  
  // Log revocation
  await AuditLog.create({
    event: 'api_key_revoked',
    keyId: keyId,
    reason: reason,
    timestamp: new Date()
  });
  
  return { success: true };
}
```

---

## Rate Limiting

### Implementation

```javascript
// middleware/rateLimit.js
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

export async function rateLimiter(req, res, next) {
  // Determine limit based on authentication
  const limit = req.authenticated ? req.rateLimit : 100;
  
  // Create unique key for this client
  const key = req.authenticated 
    ? `ratelimit:apikey:${req.apiKey._id}`
    : `ratelimit:ip:${req.ip}`;
  
  try {
    // Increment request count
    const requests = await redis.incr(key);
    
    // Set expiration on first request
    if (requests === 1) {
      await redis.expire(key, 60); // 60 seconds window
    }
    
    // Get TTL
    const ttl = await redis.ttl(key);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - requests));
    res.setHeader('X-RateLimit-Reset', Date.now() + (ttl * 1000));
    
    // Check if limit exceeded
    if (requests > limit) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: ttl
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request if Redis is down
    next();
  }
}
```

### Sliding Window Rate Limiting

```javascript
// More sophisticated rate limiting
export async function slidingWindowRateLimiter(req, res, next) {
  const limit = req.authenticated ? req.rateLimit : 100;
  const window = 60; // 60 seconds
  const key = req.authenticated 
    ? `ratelimit:sw:apikey:${req.apiKey._id}`
    : `ratelimit:sw:ip:${req.ip}`;
  
  const now = Date.now();
  const clearBefore = now - (window * 1000);
  
  try {
    // Remove old entries
    await redis.zremrangebyscore(key, 0, clearBefore);
    
    // Count requests in current window
    const requests = await redis.zcard(key);
    
    if (requests >= limit) {
      const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = parseInt(oldestEntry[1]) + (window * 1000);
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', resetTime);
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          retryAfter: retryAfter
        }
      });
    }
    
    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, window);
    
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', limit - requests - 1);
    res.setHeader('X-RateLimit-Reset', now + (window * 1000));
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next();
  }
}
```

### Endpoint-Specific Limits

```javascript
// Different limits for different endpoints
const endpointLimits = {
  '/search': { limit: 20, window: 60 },
  '/assets': { limit: 100, window: 60 },
  '/blockchain/info': { limit: 10, window: 60 },
  // Heavy endpoints
  '/assets/:id/verify': { limit: 5, window: 60 },
};

export function dynamicRateLimiter(req, res, next) {
  const endpoint = req.path.replace(/\/[a-f0-9]{64}|\/\d+/g, '/:id');
  const limits = endpointLimits[endpoint] || { limit: 100, window: 60 };
  
  req.rateLimitConfig = limits;
  return rateLimiter(req, res, next);
}
```

---

## CORS Configuration

```javascript
// server.js
import cors from 'cors';

// Production CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'https://assets.raptoreum.com',
      'https://www.raptoreum.com',
      // Add other trusted domains
    ];
    
    // Development
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000');
      allowedOrigins.push('http://localhost:4004');
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],
  
  // Expose headers
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  
  // Credentials
  credentials: true,
  
  // Preflight cache duration
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Error handler for CORS
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'CORS policy: Origin not allowed'
      }
    });
  } else {
    next(err);
  }
});
```

---

## Audit Logging

### Logging Middleware

```javascript
// middleware/audit.js
import { AuditLog } from '../models/AuditLog';
import { v4 as uuidv4 } from 'uuid';

export async function auditLogger(req, res, next) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  req.requestId = requestId;
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end function to log after response
  res.end = function(...args) {
    // Call original end
    originalEnd.apply(res, args);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Log to database (async, don't wait)
    AuditLog.create({
      timestamp: new Date(),
      requestId: requestId,
      method: req.method,
      endpoint: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      apiKey: req.apiKey?._id || null,
      queryParams: sanitizeLogData(req.query),
      requestBody: sanitizeLogData(req.body),
      responseStatus: res.statusCode,
      responseTime: responseTime,
      blockchainVerified: req.blockchainVerified || false,
      dataSource: req.dataSource || 'cache',
      assetId: req.params.assetId || null,
      txid: req.params.txid || null,
      address: req.params.address || null,
      success: res.statusCode < 400,
      errorMessage: res.statusCode >= 400 ? res.statusMessage : null
    }).catch(err => {
      console.error('Failed to log audit entry:', err);
    });
  };
  
  next();
}

// Remove sensitive data from logs
function sanitizeLogData(data) {
  if (!data) return null;
  
  const sanitized = { ...data };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'apiKey', 'token', 'secret'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}
```

### Critical Event Logging

```javascript
// Log security events
export async function logSecurityEvent(event, details) {
  await AuditLog.create({
    timestamp: new Date(),
    event: event,
    severity: 'critical',
    details: details,
    requiresReview: true
  });
  
  // Send alert for critical events
  if (event === 'unauthorized_access' || event === 'api_key_compromised') {
    await sendSecurityAlert(event, details);
  }
}

// Examples of security events to log
const securityEvents = {
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  INVALID_API_KEY: 'invalid_api_key',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SUSPICIOUS_QUERY: 'suspicious_query',
  DATA_VERIFICATION_FAILED: 'data_verification_failed',
  API_KEY_COMPROMISED: 'api_key_compromised'
};
```

---

## Data Verification

### Blockchain Verification

```javascript
// services/verification.js
import { rpcClient } from './blockchain';

export async function verifyAssetOwnership(assetId, expectedOwner) {
  try {
    // Query blockchain directly
    const asset = await rpcClient.getAsset(assetId);
    
    if (!asset) {
      throw new Error('Asset not found on blockchain');
    }
    
    // Compare with expected owner
    const isValid = asset.owner === expectedOwner;
    
    // Log verification
    await AuditLog.create({
      event: 'asset_ownership_verified',
      assetId: assetId,
      expectedOwner: expectedOwner,
      actualOwner: asset.owner,
      verified: isValid,
      timestamp: new Date()
    });
    
    return {
      verified: isValid,
      onChainOwner: asset.owner,
      expectedOwner: expectedOwner
    };
  } catch (error) {
    console.error('Verification failed:', error);
    
    await logSecurityEvent('data_verification_failed', {
      assetId: assetId,
      error: error.message
    });
    
    return {
      verified: false,
      error: error.message
    };
  }
}

export async function verifyTransaction(txid) {
  try {
    // Get transaction from blockchain
    const tx = await rpcClient.getRawTransaction(txid, true);
    
    if (!tx) {
      throw new Error('Transaction not found on blockchain');
    }
    
    // Verify confirmations
    const isConfirmed = tx.confirmations >= 6; // 6 confirmations minimum
    
    return {
      verified: true,
      confirmations: tx.confirmations,
      isConfirmed: isConfirmed,
      blockHeight: tx.blockheight
    };
  } catch (error) {
    return {
      verified: false,
      error: error.message
    };
  }
}
```

### IPFS Content Verification

```javascript
export async function verifyIPFSContent(ipfsHash, expectedContent) {
  try {
    // Fetch content from IPFS
    const content = await ipfsClient.cat(ipfsHash);
    
    // Calculate hash of fetched content
    const calculatedHash = calculateIPFSHash(content);
    
    // Verify hash matches
    const isValid = calculatedHash === ipfsHash;
    
    if (!isValid) {
      await logSecurityEvent('ipfs_verification_failed', {
        ipfsHash: ipfsHash,
        calculatedHash: calculatedHash
      });
    }
    
    return {
      verified: isValid,
      content: isValid ? content : null
    };
  } catch (error) {
    return {
      verified: false,
      error: error.message
    };
  }
}
```

---

## Security Headers

```javascript
// middleware/security.js
import helmet from 'helmet';

export function securityHeaders(app) {
  // Use Helmet to set security headers
  app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // For Tailwind
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://ipfs.io', 'https://gateway.pinata.cloud'],
        connectSrc: ["'self'", 'https://assets.raptoreum.com'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'https://ipfs.io'],
        frameSrc: ["'none'"],
      },
    },
    
    // Other security headers
    crossOriginEmbedderPolicy: false, // Allow IPFS content
    crossOriginResourcePolicy: { policy: "cross-origin" },
    
    // Strict Transport Security (HTTPS only)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    
    // X-Frame-Options
    frameguard: { action: 'deny' },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // Referrer-Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    
    // X-XSS-Protection (legacy)
    xssFilter: true,
  }));
  
  // Additional custom headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
}
```

---

## Export System Security

The export system implements multiple security layers to ensure authenticity, integrity, and secure payment processing.

### Digital Signatures

All exports are digitally signed using the Raptoreum Asset Explorer signing key to provide cryptographic proof of authenticity.

**Server Public Key (RSA-4096):**
```
-----BEGIN PUBLIC KEY-----
[To be generated during deployment]
-----END PUBLIC KEY-----
```

**Signature Implementation:**
```javascript
// services/export-signing.js
import crypto from 'crypto';
import fs from 'fs';

export class ExportSigner {
  constructor(privateKeyPath) {
    this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  }
  
  signExport(exportData) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(JSON.stringify(exportData));
    const signature = sign.sign(this.privateKey, 'hex');
    
    return {
      data: exportData,
      signature: signature,
      algorithm: 'RSA-SHA256',
      keyId: 'export-signing-key-v1'
    };
  }
}

export function verifyExportSignature(exportData, signature, publicKey) {
  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(JSON.stringify(exportData));
    return verify.verify(publicKey, signature, 'hex');
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
```

**Signature Verification:**

Users can verify export authenticity by:
1. **Checking on-chain token asset** (RTM_EXPORTS/...)
2. **Verifying IPFS content hash** matches
3. **Validating digital signature** with public key
4. **Using verification endpoint**: `/api/export/verify/:assetName`

**Public Key Distribution:**
- Published in this SECURITY.md document
- Available via API endpoint: `/api/export/public-key`
- Included in export ZIP files
- Versioned for key rotation

### Export Signing Key Security

#### Generating Encrypted Keys

**IMPORTANT:** Generate keys on a secure machine, not on the production server.

```bash
# Generate encrypted private key with AES-256
openssl genrsa -aes256 -out private_key_encrypted.pem 4096
# Enter strong passphrase (20+ characters)
# Save passphrase in password manager (1Password, LastPass, etc.)

# Generate public key from encrypted private key
openssl rsa -in private_key_encrypted.pem -pubout -out public_key.pem
# Will prompt for passphrase again

# Verify key is encrypted
grep "ENCRYPTED" private_key_encrypted.pem
# Should output: Proc-Type: 4,ENCRYPTED

# Test signing with encrypted key (optional)
echo "test data" | openssl dgst -sha256 -sign private_key_encrypted.pem | base64
```

#### Deploying Keys Securely

```bash
# 1. Create secure directory on server
ssh user@server
sudo mkdir -p /secure/rtm-explorer-keys
sudo chown rtm-explorer:rtm-explorer /secure/rtm-explorer-keys
sudo chmod 700 /secure/rtm-explorer-keys

# 2. Upload keys from local machine
scp private_key_encrypted.pem user@server:/secure/rtm-explorer-keys/private_key.pem
scp public_key.pem user@server:/secure/rtm-explorer-keys/public_key.pem

# 3. Set strict permissions
ssh user@server
sudo chmod 400 /secure/rtm-explorer-keys/private_key.pem
sudo chmod 444 /secure/rtm-explorer-keys/public_key.pem
sudo chown rtm-explorer:rtm-explorer /secure/rtm-explorer-keys/*
```

#### Passphrase Management

**Option 1: Manual Environment Variable (Recommended for Production)**

```bash
# After server boots, SSH in and set passphrase
ssh user@server
export SIGNING_KEY_PASSPHRASE='your-secure-passphrase-here'

# Restart application to pick up passphrase
pm2 restart rtm-api

# Verify initialization
pm2 logs rtm-api --lines 50 | grep "Export signer"
# Should see: "Encrypted private key loaded and verified successfully"
```

**Option 2: Passphrase File (Alternative)**

```bash
# Create passphrase file with strict permissions
echo -n 'your-secure-passphrase' > /secure/signing_passphrase.txt
chmod 400 /secure/signing_passphrase.txt
chown rtm-explorer:rtm-explorer /secure/signing_passphrase.txt

# Update .env
SIGNING_KEY_PASSPHRASE_FILE=/secure/signing_passphrase.txt
```

**Option 3: PM2 Environment Variable**

```bash
# Set passphrase in PM2 directly
pm2 set rtm-api:SIGNING_KEY_PASSPHRASE 'your-secure-passphrase'
pm2 restart rtm-api
```

#### Security Best Practices

1. **Never commit passphrase to git**
   - Add to .gitignore: `*passphrase*`, `*.key`, `*.pem`
   
2. **Never store passphrase in .env file**
   - Set manually after boot or use secure file

3. **Use strong passphrase**
   - Minimum 20 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Store in password manager

4. **Rotate keys periodically**
   - Generate new key pair annually
   - Update public key in SECURITY.md
   - Keep old public key for verification of old exports

5. **Backup encrypted keys securely**
   - Store encrypted backup off-site
   - Store passphrase separately
   - Test recovery procedure

#### Migrating from Unencrypted Key

If you currently have an unencrypted key:

```bash
# Encrypt existing key
openssl rsa -aes256 -in private_key.pem -out private_key_encrypted.pem
# Enter new passphrase

# Backup old key (optional)
mv private_key.pem private_key_old.pem.backup

# Replace with encrypted version
mv private_key_encrypted.pem private_key.pem

# Update permissions
chmod 400 private_key.pem

# Set passphrase and restart
export SIGNING_KEY_PASSPHRASE='your-new-passphrase'
pm2 restart rtm-api
```

#### Troubleshooting

**Error: "Encrypted private key requires SIGNING_KEY_PASSPHRASE"**
- Set passphrase environment variable before starting server

**Error: "Invalid passphrase for encrypted private key"**
- Verify passphrase is correct
- Test manually: `openssl rsa -in private_key.pem -check`

**Warning: "Private key is not encrypted"**
- Key is unencrypted (backward compatible but not recommended)
- Encrypt key following migration steps above

**Health Check Endpoint:**

Test export signer health and signature operations:

```bash
# Check signer health
curl http://localhost:4004/api/health/signer

# Response (healthy)
{
  "success": true,
  "service": "export-signer",
  "status": "healthy",
  "message": "Export signing operational"
}

# Response (not initialized)
{
  "success": false,
  "service": "export-signer",
  "status": "not initialized",
  "message": "Export signing keys not configured or failed to load"
}
```

### Payment Security

**Litecoin Payment Processing:**

The system uses a pruned Litecoin node for secure payment processing without exposing hot wallet risks.

```javascript
// services/payment.js
import { LitecoinRPC } from './litecoin-rpc';

export class PaymentProcessor {
  constructor() {
    this.ltcRPC = new LitecoinRPC({
      host: process.env.LITECOIN_RPC_HOST,
      port: process.env.LITECOIN_RPC_PORT,
      user: process.env.LITECOIN_RPC_USER,
      pass: process.env.LITECOIN_RPC_PASS
    });
  }
  
  async generatePaymentAddress(exportId) {
    // Generate new address for this specific export
    const address = await this.ltcRPC.getNewAddress(`export_${exportId}`);
    
    // Store mapping in database
    await PaymentAddress.create({
      exportId: exportId,
      address: address,
      amount: await this.calculateAmount(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      status: 'pending'
    });
    
    return address;
  }
  
  async calculateAmount() {
    // Get current LTC/USD rate from CoinGecko
    const rate = await this.getExchangeRate();
    const usdAmount = parseFloat(process.env.EXPORT_PRICE_USD) || 2.00;
    
    return {
      usd: usdAmount,
      ltc: (usdAmount / rate).toFixed(8),
      rate: rate,
      validFor: 1800 // 30 minutes
    };
  }
}
```

**Security Measures:**
- **Pruned Litecoin node** running on server (no hot wallet exposure)
- **Payment addresses generated per-request** (single-use)
- **30-minute payment window** with automatic expiration
- **±1% variance tolerance** for price fluctuations
- **All payment transactions** logged to audit trail

**Payment Monitoring:**
```javascript
export class PaymentMonitor {
  async monitorPayments() {
    // Watch for incoming transactions
    const pendingPayments = await PaymentAddress.find({ status: 'pending' });
    
    for (const payment of pendingPayments) {
      // Check if payment expired
      if (new Date() > payment.expiresAt) {
        await this.expirePayment(payment);
        continue;
      }
      
      // Check for transaction
      const received = await this.ltcRPC.getReceivedByAddress(payment.address, 1);
      const expectedAmount = parseFloat(payment.amount.ltc);
      const tolerance = expectedAmount * 0.01; // 1% tolerance
      
      if (received >= (expectedAmount - tolerance)) {
        await this.confirmPayment(payment);
        await this.startExportProcessing(payment.exportId);
      }
    }
  }
}
```

### Attack Vector Mitigation

**Rate Limiting:**
```javascript
// middleware/export-rate-limit.js
export const exportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.EXPORT_RATE_LIMIT_PER_HOUR || 10,
  message: 'Too many export requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address for rate limiting
    return req.ip || req.connection.remoteAddress;
  }
});
```

**Queue System:**
```javascript
// services/export-queue.js
export class ExportQueue {
  constructor() {
    this.maxConcurrent = parseInt(process.env.EXPORT_CONCURRENT_LIMIT) || 3;
    this.maxQueueSize = parseInt(process.env.EXPORT_QUEUE_MAX_SIZE) || 50;
    this.processing = new Set();
    this.queue = [];
  }
  
  async addToQueue(exportRequest) {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Export queue is full, please try again later');
    }
    
    this.queue.push(exportRequest);
    this.processQueue();
  }
  
  async processQueue() {
    while (this.processing.size < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      this.processing.add(request.exportId);
      
      this.processExport(request)
        .finally(() => {
          this.processing.delete(request.exportId);
          this.processQueue();
        });
    }
  }
}
```

**Resource Limits:**
- **File size limits**: 100MB maximum (configurable)
- **Processing timeout**: 10 minutes maximum (configurable)
- **Queue size limits**: 50 maximum pending exports (configurable)
- **Concurrent processing**: 3 exports simultaneously (configurable)
- All limits configurable via environment variables

### Token Asset Security

**Remote Raptoreumd for Asset Creation:**

Export tokens are created on a separate, secured Raptoreumd instance to isolate asset creation from the read-only explorer node.

```javascript
// services/token-asset.js
import { RaptoreumRPC } from './raptoreum-rpc';

export class TokenAssetCreator {
  constructor() {
    this.remoteRPC = new RaptoreumRPC({
      host: process.env.REMOTE_RAPTOREUMD_HOST,
      port: process.env.REMOTE_RAPTOREUMD_PORT,
      user: process.env.REMOTE_RAPTOREUMD_USER,
      pass: process.env.REMOTE_RAPTOREUMD_PASS
    });
    
    this.ownerAddress = process.env.REMOTE_RAPTOREUM_OWNER_ADDRESS;
  }
  
  async createExportToken(exportData) {
    // Generate token name
    const tokenName = this.generateTokenName(exportData);
    
    // Create sub-asset
    const txid = await this.remoteRPC.issueAsset({
      asset_name: tokenName,
      qty: 1,
      to_address: this.ownerAddress,
      is_unique: true,
      maxMintCount: 1,
      referenceHash: exportData.ipfsHash,
      ipfs_hash: exportData.ipfsHash
    });
    
    return {
      assetName: tokenName,
      txid: txid,
      ownerAddress: this.ownerAddress
    };
  }
  
  generateTokenName(exportData) {
    const type = exportData.type.toUpperCase();
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Generate 8-char hash from export content
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(exportData))
      .digest('hex')
      .substring(0, 8);
    
    return `RTM_EXPORTS/${type}_${date}_${hash}`;
  }
}
```

**Security Architecture:**
- **Export tokens created on separate, secured Raptoreumd instance**
- **Local explorer node is read-only** (no private keys)
- **Owner address holds all RTM_EXPORTS sub-assets**
- **Each export is unique NFT** (is_unique: true, maxMintCount: 1)
- **referenceHash links to IPFS content** (immutable)

**Token Properties:**
- **Uniqueness**: Each token is a unique NFT (cannot be minted again)
- **Ownership**: All tokens owned by controlled address
- **Immutability**: referenceHash cannot be changed after creation
- **Verification**: On-chain proof of export existence and integrity

**Token Naming Convention:**
- Format: `RTM_EXPORTS/[TYPE]_[YYYYMMDD]_[HASH]`
- Maximum 128 characters (Raptoreum limit)
- Hash derived from export content (deterministic)
- Examples:
  - `RTM_EXPORTS/ASSET_20260214_a3f2c1b9`
  - `RTM_EXPORTS/LEGAL_20260214_f7e9c2d1`
  - `RTM_EXPORTS/MULTI_20260214_b4a8e6f3`

---

## Sensitive Data Protection

### Environment Variables

```bash
# .env file (never commit to git)
NODE_ENV=production

# Database
MONGODB_URI=mongodb://user:password@localhost:27017/rtm_explorer
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secure_password_here

# Blockchain RPC
RPC_HOST=127.0.0.1
RPC_PORT=10225
RPC_USER=rtm_explorer
RPC_PASSWORD=secure_rpc_password_here

# IPFS
IPFS_HOST=127.0.0.1
IPFS_PORT=5001

# API
API_PORT=4004
API_SECRET=random_secret_key_here

# Backblaze B2
B2_KEY_ID=your_key_id
B2_APP_KEY=your_app_key
B2_BUCKET=rtm-explorer-backups

# Monitoring
LOG_LEVEL=info
```

```javascript
// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'RPC_HOST',
  'RPC_USER',
  'RPC_PASSWORD',
  'API_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

### Secrets Management

```javascript
// Use a secrets manager in production
import { SecretsManager } from 'aws-sdk'; // or similar

async function getSecret(secretName) {
  if (process.env.NODE_ENV === 'development') {
    return process.env[secretName];
  }
  
  // In production, use secrets manager
  const secretsManager = new SecretsManager();
  const secret = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return secret.SecretString;
}
```

### Encryption at Rest

```javascript
// Encrypt sensitive data before storing
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes
const IV_LENGTH = 16;

export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

---

## Incident Response

### Incident Response Plan

**1. Detection**
- Monitor logs for suspicious activity
- Set up alerts for security events
- Regular security audits

**2. Containment**
- Immediately revoke compromised API keys
- Block suspicious IP addresses
- Isolate affected systems if needed

**3. Investigation**
- Review audit logs
- Identify scope of breach
- Determine attack vector

**4. Remediation**
- Patch vulnerabilities
- Update affected systems
- Reset compromised credentials

**5. Recovery**
- Restore from backups if needed
- Verify data integrity
- Resume normal operations

**6. Post-Incident**
- Document incident
- Update security measures
- Communicate with stakeholders

### Incident Response Procedures

```javascript
// Automated response to security incidents
export async function handleSecurityIncident(incident) {
  // Log incident
  await AuditLog.create({
    event: 'security_incident',
    severity: 'critical',
    type: incident.type,
    details: incident.details,
    timestamp: new Date(),
    requiresReview: true
  });
  
  // Take automated action based on incident type
  switch (incident.type) {
    case 'compromised_api_key':
      await revokeApiKey(incident.keyId, 'Compromised');
      await notifyKeyOwner(incident.keyId);
      break;
      
    case 'suspicious_activity':
      await blockIP(incident.ip, 3600); // Block for 1 hour
      break;
      
    case 'brute_force_attack':
      await blockIP(incident.ip, 86400); // Block for 24 hours
      await alertAdmins(incident);
      break;
      
    case 'data_breach':
      await emergencyShutdown();
      await alertAdmins(incident);
      break;
  }
}

async function notifyKeyOwner(keyId) {
  const key = await ApiKey.findById(keyId);
  
  if (key && key.email) {
    await sendEmail({
      to: key.email,
      subject: 'Security Alert: API Key Compromised',
      body: `Your API key has been revoked due to suspicious activity. Please generate a new key.`
    });
  }
}

async function alertAdmins(incident) {
  // Send alert to admin team
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `Security Incident: ${incident.type}`,
    body: JSON.stringify(incident, null, 2)
  });
  
  // Log to monitoring system
  console.error('SECURITY INCIDENT:', incident);
}
```

---

## Security Best Practices

### Code Security

**1. Keep Dependencies Updated**
```bash
# Regularly update dependencies
npm audit
npm audit fix

# Use automated dependency updates
npm install -g npm-check-updates
ncu -u
```

**2. Use Secure Coding Practices**
- Never store secrets in code
- Use parameterized queries
- Validate all inputs
- Sanitize all outputs
- Use strong cryptography
- Implement proper error handling

**3. Code Review**
- Review all code changes for security issues
- Use automated security scanners
- Follow secure coding guidelines

### Infrastructure Security

**1. Server Hardening**
```bash
# Disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Use SSH keys only
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Enable firewall
ufw enable
ufw allow 22/tcp  # SSH
ufw allow 80/tcp  # HTTP
ufw allow 443/tcp # HTTPS
```

**2. Network Security**
- Use firewall to restrict access
- Only expose necessary ports
- Use VPN for internal services
- Implement DDoS protection

**3. Monitoring & Alerting**
```javascript
// Monitor for security events
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console()
  ]
});

// Log security events
securityLogger.warn('Suspicious activity detected', {
  ip: req.ip,
  endpoint: req.path,
  timestamp: new Date()
});
```

### Database Security

**1. MongoDB Security**
```javascript
// Use authentication
mongodb://username:password@localhost:27017/database

// Enable access control
use admin
db.createUser({
  user: "admin",
  pwd: "secure_password",
  roles: ["root"]
})

// Restrict network access
net:
  bindIp: 127.0.0.1
```

**2. Backup Security**
```bash
# Encrypt backups
mongodump --out=/backup/$(date +%Y%m%d)
tar czf backup.tar.gz /backup/$(date +%Y%m%d)
gpg --encrypt --recipient admin@raptoreum.com backup.tar.gz

# Upload to secure storage
b2 upload-file rtm-backups backup.tar.gz.gpg backups/$(date +%Y%m%d).tar.gz.gpg
```

### Application Security

**1. Session Management**
- Use secure session cookies
- Implement session timeout
- Regenerate session IDs

**2. Password Security** (if user accounts are added)
```javascript
import bcrypt from 'bcrypt';

// Hash passwords
const hashedPassword = await bcrypt.hash(password, 12);

// Verify passwords
const isValid = await bcrypt.compare(password, hashedPassword);
```

**3. HTTPS Only**
```nginx
# Nginx configuration
server {
    listen 80;
    server_name assets.raptoreum.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name assets.raptoreum.com;
    
    ssl_certificate /etc/letsencrypt/live/assets.raptoreum.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/assets.raptoreum.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

---

## Vulnerability Management

### Regular Security Audits

**1. Automated Scanning**
```bash
# npm audit
npm audit

# Snyk security scan
npm install -g snyk
snyk test
snyk monitor

# OWASP Dependency Check
dependency-check --project "RTM Explorer" --scan ./
```

**2. Manual Security Review**
- Review authentication mechanisms
- Test input validation
- Check for exposed secrets
- Verify access controls
- Test rate limiting

### Vulnerability Disclosure

**Contact**: security@raptoreum.com

**Process**:
1. Report vulnerability via email
2. Wait for acknowledgment (within 48 hours)
3. Allow time for patch (typically 30-90 days)
4. Public disclosure after patch

### Security Updates

```bash
# Keep system updated
apt update && apt upgrade -y

# Keep Node.js updated
nvm install node --reinstall-packages-from=current

# Keep dependencies updated
npm update
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-13
**Author**: Salty-Dragon
**Status**: Complete - Ready for Implementation
