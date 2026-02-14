# Blockchain Sync Daemon Documentation

## Overview

The RTM Asset Explorer Sync Daemon is a critical background service that continuously indexes blocks, transactions, and assets from the Raptoreum blockchain into MongoDB. This document provides comprehensive information about how it works, how to configure it, and how to troubleshoot issues.

---

## Architecture

### Components

1. **Sync Daemon** (`src/services/sync-daemon.js`)
   - Main sync loop and orchestration
   - Block fetching and processing
   - Error recovery and retry logic
   - State management

2. **Asset Processor** (`src/services/assetProcessor.js`)
   - Asset creation (Type 8 - NewAssetTx)
   - Asset minting (Type 10 - MintAssetTx)
   - Asset transfers (Type 0 with transferasset vout)
   - Asset updates (Type 9 - UpdateAssetTx)

3. **Future Checker** (`src/services/futureChecker.js`)
   - Future transaction handling (Type 7 - FutureTx)
   - Automatic unlocking of mature futures
   - Future output tracking

4. **IPFS Service** (`src/services/ipfs.js`)
   - Metadata fetching with fallback gateways
   - MongoDB caching
   - Image URL resolution

---

## Transaction Type Handling

### Raptoreum Transaction Types

| Type | Name | Description | Handler |
|------|------|-------------|---------|
| 0 | Standard | RTM transfer or asset transfer | `handleAssetTransfer` |
| 7 | FutureTx | Time/confirmation-locked RTM/assets | `handleFutureTransaction` |
| 8 | NewAssetTx | Asset creation | `handleAssetCreation` |
| 9 | UpdateAssetTx | Asset metadata update | `handleAssetUpdate` |
| 10 | MintAssetTx | Asset minting to address | `handleAssetMint` |

### Asset Detection Logic

#### Type 8 - Asset Creation
```javascript
{
  "type": 8,
  "newAssetTx": {
    "name": "BITKNIVES",
    "isUnique": false,
    "maxMintCount": 1,
    "updatable": true,
    "referenceHash": "QmXXX...",  // IPFS hash
    "ownerAddress": "RAddress..."
  }
}
```

**Processing:**
1. Parse `newAssetTx` data
2. Detect sub-assets (split by `|`)
3. Link to parent if sub-asset
4. Fetch IPFS metadata if `referenceHash` exists
5. Save to `Asset` collection
6. Record in `Transaction` collection

#### Type 10 - Asset Mint
```javascript
{
  "type": 10,
  "MintAssetTx": {
    "assetId": "ca0255fd7f...",
    "fee": 100
  },
  "vout": [{
    "scriptPubKey": {
      "type": "transferasset",
      "asset": {
        "name": "ASSET_NAME",
        "amount": 1.0
      },
      "addresses": ["RRecipient..."]
    }
  }]
}
```

**Processing:**
1. Parse `MintAssetTx` data
2. Find asset vout (type: "transferasset")
3. Update `mintCount` and `circulatingSupply`
4. Update owner to recipient
5. Record in `AssetTransfer` collection
6. Save transaction

#### Type 0 - Asset Transfer
```javascript
{
  "type": 0,
  "vout": [{
    "scriptPubKey": {
      "type": "transferasset",  // Key detection!
      "asset": {
        "name": "ASSET_NAME",
        "amount": 1.0
      },
      "addresses": ["RNewOwner..."]
    }
  }]
}
```

**Processing:**
1. Find asset vout (type: "transferasset")
2. Trace sender from vin (lookup previous tx)
3. Update asset owner
4. Record in `AssetTransfer` collection

#### Type 7 - Future Lock
```javascript
{
  "type": 7,
  "futureTx": {
    "maturity": 100,        // Confirmations required
    "lockTime": 86400,      // OR seconds required
    "lockOutputIndex": 0    // Which vout is locked
  }
}
```

**Processing:**
1. Get `lockOutputIndex` from `futureTx`
2. Determine if RTM or asset future
3. Calculate `unlockHeight = blockHeight + maturity`
4. Calculate `unlockTime = blockTime + lockTime`
5. Save to `FutureOutput` collection

---

## Sub-Asset Support

### Naming Convention

- **Root asset:** `NUKEBOOM`
- **Sub-asset:** `NUKEBOOM|tower` (pipe separator)
- **Export sub-asset:** `RTM_EXPORTS|LEGAL 20260214 001`

### Rules

- ✅ Spaces allowed in sub-asset names
- ❌ No hyphens, underscores, or periods in sub-assets
- Each sub-asset has unique `assetId`
- Sub-assets are independent entities

### Detection

```javascript
const isSubAsset = name.includes('|');
if (isSubAsset) {
  const parts = name.split('|');
  parentAssetName = parts[0].trim();
  subAssetName = parts.slice(1).join('|').trim();
}
```

---

## Configuration

### Environment Variables

```bash
# Sync Daemon
SYNC_ENABLED=true
SYNC_START_HEIGHT=0              # Start from genesis or specific height
SYNC_BATCH_SIZE=100              # Blocks to process per batch
SYNC_CONCURRENT_BLOCKS=5         # Parallel block processing
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY=30000           # 30 seconds
SYNC_CHECKPOINT_INTERVAL=100     # Save state every N blocks

# IPFS
IPFS_LOCAL_GATEWAY=http://127.0.0.1:8080
IPFS_RAPTOREUM_GATEWAY=https://ipfs.raptoreum.com
IPFS_PUBLIC_GATEWAY=https://ipfs.io
IPFS_TIMEOUT=10000
IPFS_RETRY_ATTEMPTS=3

# Logging
LOG_DIR=./logs
LOG_LEVEL=info
```

### PM2 Configuration

The sync daemon runs as a separate PM2 process:

```javascript
{
  name: 'rtm-sync',
  script: './src/services/sync-daemon.js',
  instances: 1,
  exec_mode: 'fork',
  max_memory_restart: '2G',
  autorestart: true,
  restart_delay: 10000
}
```

---

## Monitoring

### Monitor Script

Use the provided monitoring script:

```bash
cd backend
./scripts/monitor-sync.sh
```

**Output:**
- Blockchain height
- Database sync height
- Blocks behind
- Sync progress percentage
- Database statistics
- PM2 process status
- Recent sync logs

### API Endpoints

#### Get Sync Status
```bash
GET /api/sync/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "syncing",
    "currentBlock": 150000,
    "targetBlock": 200000,
    "behindBlocks": 50000,
    "progress": "75.00%",
    "isSynced": false,
    "lastSync": "2024-02-14T21:00:00.000Z",
    "averageBlockTime": 123.5
  }
}
```

#### Get Sync Statistics
```bash
GET /api/sync/stats
```

### Log Files

- **Sync Output:** `logs/sync-out.log`
- **Sync Errors:** `logs/sync-error.log`
- **Sync Details:** `logs/sync.log`

---

## Performance Tuning

### Batch Size

Adjust `SYNC_BATCH_SIZE` based on server performance:

- **Low-end server:** 10-50 blocks
- **Mid-range server:** 100-200 blocks
- **High-end server:** 500-1000 blocks

### Memory Management

Monitor memory usage and adjust `max_memory_restart` in PM2:

```bash
pm2 monit
```

### Database Indexes

Ensure all indexes are created:

```bash
node -e "
import('./src/models/Asset.js').then(m => m.default.createIndexes());
import('./src/models/AssetTransfer.js').then(m => m.default.createIndexes());
import('./src/models/FutureOutput.js').then(m => m.default.createIndexes());
"
```

---

## Error Recovery

### Automatic Recovery

The sync daemon automatically:

1. **Retries failed blocks** up to `SYNC_RETRY_ATTEMPTS` times
2. **Resumes from last synced block** after restart
3. **Handles duplicate records** (ignores MongoDB duplicate errors)
4. **Backs off on errors** with exponential delay

### Manual Recovery

If sync gets stuck:

```bash
# Check PM2 status
pm2 list

# Restart sync daemon
pm2 restart rtm-sync

# Check logs
pm2 logs rtm-sync

# Reset sync state (if necessary)
mongosh rtm_explorer --eval "db.sync_states.updateOne({service:'blocks'}, {\$set: {status: 'not_started', currentBlock: 0}})"
pm2 restart rtm-sync
```

---

## Troubleshooting

### Sync Not Starting

**Problem:** Daemon shows as running but no progress

**Solution:**
1. Check `SYNC_ENABLED=true` in `.env`
2. Verify blockchain connection: `raptoreum-cli getblockchaininfo`
3. Check MongoDB connection
4. Review logs: `pm2 logs rtm-sync`

### Slow Sync Speed

**Problem:** Sync is taking too long

**Solution:**
1. Increase `SYNC_BATCH_SIZE`
2. Disable IPFS fetching temporarily (comment out)
3. Check network latency to blockchain node
4. Verify database performance (indexes)

### IPFS Timeout Issues

**Problem:** Frequent IPFS fetch timeouts

**Solution:**
1. Increase `IPFS_TIMEOUT`
2. Use faster IPFS gateway
3. Disable IPFS for initial sync, enable later
4. Check IPFS cache statistics

### Memory Issues

**Problem:** Sync daemon crashes with out-of-memory

**Solution:**
1. Reduce `SYNC_BATCH_SIZE`
2. Increase `max_memory_restart` in PM2
3. Monitor with `pm2 monit`
4. Check for memory leaks in logs

### Blockchain Reorgs

**Problem:** Chain reorganization detected

**Solution:**
1. Sync daemon will automatically retry affected blocks
2. May need to manually remove blocks: `db.blocks.deleteMany({height: {$gte: reorgHeight}})`
3. Restart sync from before reorg

---

## Initial Sync Time Estimates

Factors affecting sync time:
- Total blockchain height
- Server CPU/RAM
- Network speed to blockchain node
- IPFS metadata fetching
- Database write speed

**Estimates:**

| Blocks | Batch Size | Server | Estimated Time |
|--------|------------|--------|----------------|
| 100k | 100 | Mid-range | 12-24 hours |
| 500k | 100 | Mid-range | 48-72 hours |
| 100k | 500 | High-end | 6-12 hours |
| 500k | 500 | High-end | 24-36 hours |

**Note:** Initial sync with IPFS fetching will be slower. Consider syncing blocks first, then backfilling IPFS metadata.

---

## Future Unlocking

The sync daemon automatically checks and unlocks mature future outputs:

- **Check frequency:** After each block batch sync
- **Unlock conditions:** Block height >= unlockHeight OR current time >= unlockTime
- **Status update:** `locked` → `unlocked`
- **Tracking:** `unlockedBy` field records if unlocked by confirmations or time

---

## Maintenance

### Regular Tasks

1. **Monitor disk space** for log files
2. **Check sync status** daily
3. **Review error logs** weekly
4. **Clean old IPFS cache** monthly

### Log Rotation

Logs are automatically rotated by Winston:
- Max size: 10MB per file
- Max files: 10 (100MB total)

### Database Maintenance

```bash
# Compact collections
mongosh rtm_explorer --eval "
  db.runCommand({compact: 'blocks'});
  db.runCommand({compact: 'transactions'});
  db.runCommand({compact: 'assets'});
"

# Rebuild indexes
mongosh rtm_explorer --eval "
  db.blocks.reIndex();
  db.transactions.reIndex();
  db.assets.reIndex();
"
```

---

## API Integration

### Query Examples

#### Get asset with sub-assets
```bash
GET /api/assets/:assetId/subassets
```

#### Get transfer history
```bash
GET /api/assets/:assetId/transfers?page=1&limit=50
```

#### Get locked futures
```bash
GET /api/sync/futures/locked?address=RAddress
```

#### Get specific future output
```bash
GET /api/sync/futures/:txid/:vout
```

---

## Security Considerations

1. **Read-only blockchain access** - Sync daemon only reads from blockchain
2. **No private keys** - Daemon doesn't handle wallets
3. **MongoDB authentication** - Always use authenticated MongoDB connections
4. **Rate limiting** - API endpoints are rate-limited
5. **Input validation** - All blockchain data is validated before storage

---

## Support

For issues or questions:

1. Check logs first: `pm2 logs rtm-sync`
2. Run monitor script: `./scripts/monitor-sync.sh`
3. Review this documentation
4. Check GitHub issues
5. Contact development team

---

## Version History

- **v1.0.0** - Initial implementation with full sync support
  - Block syncing
  - Asset indexing (create, mint, transfer, update)
  - Future locks
  - Sub-asset support
  - IPFS metadata fetching
