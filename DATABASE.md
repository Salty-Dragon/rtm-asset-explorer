# Database Schema Design

## Overview

The MongoDB database serves as the indexed, queryable cache of blockchain data. It enables fast searches, analytics, and reduces load on the Raptoreumd node. All critical data can be re-synced from the blockchain if needed.

## Database: `rtm_explorer`

### Collection: `blocks`

Stores blockchain block information.

```javascript
{
  _id: ObjectId,
  height: Number,              // Block height (indexed, unique)
  hash: String,                // Block hash (indexed, unique)
  previousHash: String,        // Previous block hash
  merkleRoot: String,          // Merkle root
  timestamp: Date,             // Block timestamp (indexed)
  difficulty: Number,          // Block difficulty
  nonce: Number,               // Nonce value
  size: Number,                // Block size in bytes
  transactionCount: Number,    // Number of transactions
  transactions: [String],      // Array of transaction IDs
  miner: String,               // Miner address
  reward: Number,              // Block reward
  confirmations: Number,       // Number of confirmations
  createdAt: Date,             // When indexed
  updatedAt: Date              // Last updated
}
```

**Indexes:**
```javascript
db.blocks.createIndex({ height: -1 }, { unique: true })
db.blocks.createIndex({ hash: 1 }, { unique: true })
db.blocks.createIndex({ timestamp: -1 })
db.blocks.createIndex({ miner: 1, timestamp: -1 })
```

---

### Collection: `transactions`

Stores all blockchain transactions.

```javascript
{
  _id: ObjectId,
  txid: String,                // Transaction ID (indexed, unique)
  blockHeight: Number,         // Block height (indexed)
  blockHash: String,           // Block hash
  timestamp: Date,             // Transaction timestamp (indexed)
  confirmations: Number,       // Number of confirmations
  size: Number,                // Transaction size in bytes
  fee: Number,                 // Transaction fee
  inputs: [{
    txid: String,              // Previous transaction ID
    vout: Number,              // Output index
    address: String,           // Input address
    amount: Number,            // Input amount
    scriptSig: String          // Script signature
  }],
  outputs: [{
    n: Number,                 // Output index
    address: String,           // Output address (indexed)
    amount: Number,            // Output amount
    scriptPubKey: String,      // Script public key
    spent: Boolean,            // Whether output is spent
    spentTxid: String,         // Transaction that spent this output
    spentAt: Date              // When it was spent
  }],
  type: String,                // 'standard', 'asset_create', 'asset_transfer'
  assetData: {                 // Only for asset transactions
    assetId: String,           // Asset identifier
    operation: String,         // 'create', 'transfer', 'update'
    amount: Number,            // For fungible assets
    metadata: Object           // Asset-specific data
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
db.transactions.createIndex({ txid: 1 }, { unique: true })
db.transactions.createIndex({ blockHeight: -1 })
db.transactions.createIndex({ timestamp: -1 })
db.transactions.createIndex({ 'outputs.address': 1, timestamp: -1 })
db.transactions.createIndex({ 'inputs.address': 1, timestamp: -1 })
db.transactions.createIndex({ type: 1, timestamp: -1 })
db.transactions.createIndex({ 'assetData.assetId': 1 })
```

---

### Collection: `assets`

Stores all asset information (both fungible and non-fungible).

```javascript
{
  _id: ObjectId,
  assetId: String,             // Unique asset identifier (indexed, unique)
  name: String,                // Asset name (indexed for search)
  type: String,                // 'fungible' or 'non-fungible'
  
  // Creation info
  createdAt: Date,             // When asset was created (indexed)
  createdTxid: String,         // Creation transaction ID
  createdBlockHeight: Number,  // Block height of creation
  creator: String,             // Creator address (indexed)
  
  // Current state
  currentOwner: String,        // Current owner address (indexed, null for fungible)
  totalSupply: Number,         // Total supply (for fungible)
  circulatingSupply: Number,   // Circulating supply
  decimals: Number,            // Decimal places (for fungible)
  
  // Metadata
  metadata: {
    name: String,              // Display name
    description: String,       // Asset description (text indexed)
    image: String,             // IPFS hash for image
    imageUrl: String,          // Full IPFS URL
    animationUrl: String,      // For animated/video assets
    externalUrl: String,       // External website
    attributes: [{             // For NFTs
      trait_type: String,
      value: Mixed,            // String, Number, or Boolean
      display_type: String     // Optional display hint
    }],
    properties: Object,        // Additional properties
    rawMetadata: Object        // Original metadata from IPFS
  },
  
  // IPFS
  ipfsHash: String,            // Metadata IPFS hash (indexed)
  ipfsVerified: Boolean,       // Whether IPFS content was verified
  ipfsLastChecked: Date,       // Last IPFS verification
  
  // Transfer history
  transferCount: Number,       // Number of transfers
  lastTransfer: {
    txid: String,
    from: String,
    to: String,
    timestamp: Date
  },
  
  // Analytics
  views: Number,               // View count
  favorites: Number,           // Number of users who favorited  
  
  // Flags
  verified: Boolean,           // Manual verification flag
  featured: Boolean,           // Featured asset flag
  hidden: Boolean,             // Hidden from public view  
  
  // Search optimization
  searchText: String,          // Combined searchable text
  tags: [String],              // Searchable tags (indexed)
  categories: [String],        // Categories (indexed)
  
  updatedAt: Date
}
```

**Indexes:**
```javascript
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

// Text index for search
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
```

---

### Collection: `addresses`

Stores address information and balances.

```javascript
{
  _id: ObjectId,
  address: String,             // Raptoreum address (indexed, unique)
  
  // Balance
  balance: Number,             // Current RTM balance
  totalReceived: Number,       // Total RTM received
  totalSent: Number,           // Total RTM sent  
  
  // Activity
  firstSeenBlock: Number,      // First block with this address
  lastSeenBlock: Number,       // Last block with this address
  firstSeenAt: Date,           // First seen timestamp
  lastSeenAt: Date,            // Last seen timestamp (indexed)
  transactionCount: Number,    // Total transaction count
  
  // Assets
  assetBalances: [{            // Asset holdings
    assetId: String,
    balance: Number,           // For fungible
    assets: [String],          // For non-fungible (array of asset IDs)
    lastUpdated: Date
  }],
  assetsCreated: Number,       // Number of assets created
  assetsOwned: Number,         // Number of NFTs owned  
  
  // Profile (if claimed)
  profile: {
    username: String,          // Claimed username (indexed, sparse)
    displayName: String,       // Display name
    bio: String,               // Biography
    avatar: String,            // IPFS hash for avatar
    website: String,           // Website URL
    social: {
      twitter: String,
      discord: String,
      github: String
    },
    verified: Boolean          // Verified creator
  },  
  
  // Analytics
  isCreator: Boolean,          // Whether address created assets
  isContract: Boolean,         // Whether this is a contract address
  tags: [String],              // Address tags ('exchange', 'creator', etc.)
  
  updatedAt: Date
}
```

**Indexes:**
```javascript
db.addresses.createIndex({ address: 1 }, { unique: true })
db.addresses.createIndex({ lastSeenAt: -1 })
db.addresses.createIndex({ balance: -1 })
db.addresses.createIndex({ transactionCount: -1 })
db.addresses.createIndex({ isCreator: 1, assetsCreated: -1 })
db.addresses.createIndex({ 'profile.username': 1 }, { unique: true, sparse: true })
db.addresses.createIndex({ 'assetBalances.assetId': 1 })
```

---

### Collection: `asset_transfers`

Stores asset transfer history for quick lookups.

```javascript
{
  _id: ObjectId,
  assetId: String,             // Asset identifier (indexed)
  txid: String,                // Transaction ID (indexed)
  blockHeight: Number,         // Block height
  timestamp: Date,             // Transfer timestamp (indexed)
  
  from: String,                // Sender address (indexed)
  to: String,                  // Receiver address (indexed)
  amount: Number,              // Amount (for fungible)
  
  type: String,                // 'create', 'transfer', 'burn'
  fee: Number,                 // Transaction fee  
  
  createdAt: Date
}
```

**Indexes:**
```javascript
db.asset_transfers.createIndex({ assetId: 1, timestamp: -1 })
db.asset_transfers.createIndex({ txid: 1 })
db.asset_transfers.createIndex({ from: 1, timestamp: -1 })
db.asset_transfers.createIndex({ to: 1, timestamp: -1 })
db.asset_transfers.createIndex({ timestamp: -1 })
```

---

### Collection: `api_keys`

Stores API keys for third-party access.

```javascript
{
  _id: ObjectId,
  key: String,                 // API key (hashed, indexed, unique)
  keyPrefix: String,           // First 8 chars for display
  
  // Owner info
  name: String,                // API key name/description
  email: String,               // Contact email
  organization: String,        // Organization name
  
  // Permissions
  tier: String,                // 'free', 'premium'
  rateLimit: Number,           // Requests per minute
  endpoints: [String],         // Allowed endpoints (empty = all)
  
  // Usage tracking
  totalRequests: Number,       // Total requests made
  lastUsed: Date,              // Last usage timestamp
  
  // Status
  active: Boolean,             // Whether key is active
  expiresAt: Date,             // Expiration date (null = never)
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
db.api_keys.createIndex({ key: 1 }, { unique: true })
db.api_keys.createIndex({ active: 1, tier: 1 })
db.api_keys.createIndex({ email: 1 })
```

---

### Collection: `audit_logs`

Stores audit trail for legal compliance.

```javascript
{
  _id: ObjectId,
  timestamp: Date,             // Log timestamp (indexed, TTL)
  
  // Request info
  requestId: String,           // Unique request ID
  method: String,              // HTTP method
  endpoint: String,            // API endpoint
  ip: String,                  // Client IP (indexed)
  userAgent: String,           // User agent
  
  // Authentication
  apiKey: String,              // API key used (if any)
  userId: String,              // User ID (if authenticated)
  
  // Request/Response
  queryParams: Object,         // Query parameters
  requestBody: Object,         // Request body (sanitized)
  responseStatus: Number,      // HTTP status code
  responseTime: Number,        // Response time in ms
  
  // Blockchain verification
  blockchainVerified: Boolean, // Whether data was verified from blockchain
  dataSource: String,          // 'blockchain', 'cache', 'ipfs'
  
  // Asset/Transaction specific
  assetId: String,             // If asset-related (indexed)
  txid: String,                // If transaction-related (indexed)
  address: String,             // If address-related (indexed)
  
  // Result
  success: Boolean,            // Whether request succeeded
  errorMessage: String,        // Error message if failed  
  
  createdAt: Date
}
```

**Indexes:**
```javascript
db.audit_logs.createIndex({ timestamp: -1 })
db.audit_logs.createIndex({ ip: 1, timestamp: -1 })
db.audit_logs.createIndex({ apiKey: 1, timestamp: -1 })
db.audit_logs.createIndex({ assetId: 1, timestamp: -1 })
db.audit_logs.createIndex({ txid: 1 })
db.audit_logs.createIndex({ address: 1, timestamp: -1 })

// TTL index - automatically delete logs older than 90 days
db.audit_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 })
```

---

### Collection: `analytics`

Stores aggregated analytics data.

```javascript
{
  _id: ObjectId,
  date: Date,                  // Date of analytics (indexed)
  period: String,              // 'hourly', 'daily', 'weekly', 'monthly'
  
  // Blockchain stats
  blockchain: {
    totalBlocks: Number,
    totalTransactions: Number,
    averageBlockTime: Number,
    difficulty: Number,
    hashrate: Number
  },  
  
  // Asset stats
  assets: {
    totalAssets: Number,
    fungibleAssets: Number,
    nonFungibleAssets: Number,
    newAssets: Number,         // New in this period
    totalTransfers: Number,
    activeAssets: Number,      // Assets with transfers
    topAssets: [{              // Most active assets
      assetId: String,
      name: String,
      transfers: Number,
      volume: Number
    }]
  },  
  
  // Creator stats
  creators: {
    totalCreators: Number,
    newCreators: Number,
    activeCreators: Number,
    topCreators: [{
      address: String,
      username: String,
      assetsCreated: Number,
      totalVolume: Number
    }]
  },  
  
  // API usage
  api: {
    totalRequests: Number,
    uniqueIPs: Number,
    averageResponseTime: Number,
    errorRate: Number,
    topEndpoints: [{
      endpoint: String,
      requests: Number
    }]
  },  
  
  // Search stats
  search: {
    totalSearches: Number,
    topSearchTerms: [{
      term: String,
      count: Number
    }],
    noResultsSearches: Number
  },  
  
  createdAt: Date
}
```

**Indexes:**
```javascript
db.analytics.createIndex({ date: -1, period: 1 })
db.analytics.createIndex({ period: 1, date: -1 })
```

---

### Collection: `ipfs_cache`

Caches IPFS metadata for performance.

```javascript
{
  _id: ObjectId,
  hash: String,                // IPFS hash (indexed, unique)
  
  // Content
  content: Object,             // Parsed JSON content
  contentType: String,         // MIME type
  size: Number,                // Size in bytes
  
  // Verification
  verified: Boolean,           // Whether content matches hash
  accessible: Boolean,         // Whether content is accessible
  
  // Usage
  references: Number,          // Number of assets using this
  lastAccessed: Date,          // Last access time
  accessCount: Number,         // Total access count
  
  // Status
  pinned: Boolean,             // Whether pinned locally  
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
db.ipfs_cache.createIndex({ hash: 1 }, { unique: true })
db.ipfs_cache.createIndex({ lastAccessed: 1 })
db.ipfs_cache.createIndex({ pinned: 1 })

// TTL index - delete unused content after 30 days
db.ipfs_cache.createIndex(
  { lastAccessed: 1 }, 
  { 
    expireAfterSeconds: 2592000,
    partialFilterExpression: { references: 0, pinned: false }
  }
)
```

---

### Collection: `sync_state`

Tracks synchronization state.

```javascript
{
  _id: ObjectId,
  service: String,             // 'blocks', 'transactions', 'assets', 'ipfs'
  
  // Current state
  currentBlock: Number,        // Current synced block height
  currentHash: String,         // Current block hash
  targetBlock: Number,         // Target block height
  
  // Progress
  startBlock: Number,          // Starting block of current sync
  blocksProcessed: Number,     // Blocks processed in current run
  itemsProcessed: Number,      // Items processed (txs, assets, etc.)
  
  // Performance
  averageBlockTime: Number,    // Average time per block (ms)
  estimatedCompletion: Date,   // Estimated completion time
  
  // Status
  status: String,              // 'syncing', 'synced', 'error', 'paused'
  lastError: String,           // Last error message
  
  lastSyncedAt: Date,        // Last successful sync
  updatedAt: Date
}
```

**Indexes:**
```javascript
db.sync_state.createIndex({ service: 1 }, { unique: true })
db.sync_state.createIndex({ status: 1 })
```

---

## Data Integrity Rules

### 1. Blockchain Data Verification
- All block and transaction data must be verifiable against raptoreumd
- Asset ownership must always be verified from blockchain
- Critical queries should include verification flag

### 2. IPFS Content Verification
- All IPFS content must be hash-verified after retrieval
- Content that fails verification should be flagged
- Retry failed content periodically

### 3. Referential Integrity
- Transactions reference valid blocks
- Asset transfers reference valid transactions
- Address balances match transaction history

### 4. Data Consistency
- Asset transfer counts match actual transfers
- Address transaction counts match actual transactions
- Analytics aggregate correctly from source data

## Backup and Recovery

### Backup Strategy
```javascript
// Daily full backup
mongodump --db=rtm_explorer --out=/backup/$(date +%Y%m%d)

// Incremental backup (oplog)
mongodump --db=rtm_explorer --oplog --out=/backup/incremental
```

### Recovery Procedures
1. **Full Restore**: Restore from most recent backup
2. **Incremental Restore**: Apply oplog changes
3. **Re-sync**: If data is corrupted, re-sync from blockchain
4. **Selective Restore**: Restore specific collections if needed

### Re-sync Priority
If complete re-sync is needed:
1. Blocks (sequential from genesis)
2. Transactions (from blocks)
3. Assets (from transactions)
4. Asset transfers (from transactions)
5. Addresses (from transactions)
6. Analytics (from aggregated data)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-13
**Author**: Salty-Dragon
**Status**: Draft - Ready for Review