# Transaction Tracking Fix

This document explains the issue with transaction tracking and how to fix it.

## Problem

Transactions for assets were not showing up in the asset explorer because:

1. **Asset transfer detection logic had bugs** - Only checked for `scriptPubKey.type === 'transferasset'` but didn't check for other possible structures
2. **Transfer recording had silent failures** - Duplicate key errors were silently ignored without proper logging
3. **Sender address resolution was unreliable** - Only checked first input address

## What Was Fixed

### 1. Improved Transfer Detection
- Now checks multiple possible scriptPubKey structures:
  - `scriptPubKey.type === 'transferasset'`
  - `scriptPubKey.asset` (asset data present)
  - `scriptPubKey.type === 'pubkeyhash' && scriptPubKey.asset`
  
### 2. Added Comprehensive Logging
- Logs when asset transfers are detected
- Logs when transfers are recorded
- Logs warnings when asset data is missing
- Logs errors with full context

### 3. Improved Error Handling
- Better duplicate detection
- Proper error logging
- Returns existing records on duplicates

### 4. Added Blockchain Fallback
- When no transfers found in database, queries blockchain directly using `getaddressdeltas`
- Provides informative messages when blockchain data can't be fetched
- Only queries owner address (partial data) but better than nothing

### 5. Updated Stats Endpoint
- Now counts `AssetTransfer` documents instead of `Transaction` documents
- More accurately reflects asset transaction activity

## How to Fix Transaction Display

Since the sync daemon has already synced to the current block height but with the old (buggy) detection logic, you have two options:

### Option 1: Use Blockchain Fallback (No Re-sync Needed)

The improved code now includes a blockchain fallback that queries the Raptoreum node directly when no transfers are found in the database. This will work immediately without needing to re-sync.

**Pros:**
- No downtime
- Works immediately
- No database changes needed

**Cons:**
- Only shows transfers for the owner/creator address (not all transfers)
- Slightly slower than database queries
- Requires address indexing enabled on the node (already confirmed available)

### Option 2: Force Re-sync (Recommended for Complete Data)

Re-sync blocks to detect and record all transfers with the fixed detection logic.

#### Step 1: Check Current State

```bash
cd /home/runner/work/rtm-asset-explorer/rtm-asset-explorer/backend
node check-transfer-data.js
```

This will show:
- How many assets exist
- How many transfers are recorded
- Whether a re-sync is needed

#### Step 2: Force Re-sync

**To re-sync from the beginning (clears all synced data):**
```bash
node force-resync.js --from 0 --clear-all
```

**To re-sync from a specific block:**
```bash
node force-resync.js --from 1000000
```

**To just clear transfers and re-detect them:**
```bash
node force-resync.js --from 0 --clear-transfers
```

#### Step 3: Restart Sync Daemon

After running force-resync, restart the sync daemon:

```bash
# If using PM2:
pm2 restart sync-daemon

# If running manually:
npm run start:sync
```

#### Step 4: Monitor Progress

Watch the logs to ensure transfers are being detected:

```bash
# If using PM2:
pm2 logs sync-daemon

# If running manually, check the console output
```

You should see log entries like:
- `Detected asset transfer in tx <txid> at block <height>`
- `Processing N asset transfer(s) in tx <txid>`
- `✓ Recorded asset transfer: <assetName> in <txid>, amount: <amount>`

#### Step 5: Verify Results

After sync completes, check the data again:

```bash
node check-transfer-data.js
```

## Testing

### Test Transfer Detection

Create a test to verify transfers are being detected:

```bash
# Watch logs during sync
pm2 logs sync-daemon --lines 100
```

Look for:
- Asset transfer detection messages
- Transfer recording confirmations
- Any warnings or errors

### Test UI Display

1. Open the asset explorer in your browser
2. Check the main page - "Transactions" should show a number > 0
3. Click on an individual asset
4. Check the "Transfer History" section - should show transfers

## Troubleshooting

### No transfers detected after re-sync

1. Check if assets actually have transfers on the blockchain:
   ```bash
   # Use raptoreum-cli to check
   raptoreum-cli getaddressdeltas '{"addresses":["<owner-address>"],"asset":"<asset-name>"}'
   ```

2. Check logs for errors:
   ```bash
   pm2 logs sync-daemon --err
   ```

3. Verify the transaction structure matches expectations - log a sample transaction:
   ```javascript
   // Add to sync-daemon.js in processTransaction:
   if (tx.vout?.some(v => v.scriptPubKey?.asset)) {
     console.log('Sample asset tx:', JSON.stringify(tx, null, 2));
   }
   ```

### Blockchain fallback not working

1. Verify address indexing is enabled on the node:
   ```bash
   raptoreum-cli getaddressdeltas '{"addresses":["<any-address>"]}'
   ```

   If you get an error about indexing, add to `raptoreum.conf`:
   ```
   txindex=1
   addressindex=1
   ```
   Then restart raptoreumd and reindex.

2. Check the API logs for errors when fetching transfers

### Transfer count still shows 0 on assets

This could be because:
1. The asset was created but never transferred
2. The sync hasn't reached blocks with transfers yet
3. The `transferCount` field needs to be recalculated

To recalculate transfer counts:
```javascript
// Run in mongo shell or create a script:
const Asset = require('./src/models/Asset');
const AssetTransfer = require('./src/models/AssetTransfer');

async function recalculateTransferCounts() {
  const assets = await Asset.find();
  for (const asset of assets) {
    const count = await AssetTransfer.countDocuments({
      assetName: asset.name,
      type: 'transfer'  // Don't count mints
    });
    asset.transferCount = count;
    await asset.save();
  }
}
```

## Summary

The transaction tracking issue has been fixed with:
1. Improved detection logic
2. Better error handling
3. Comprehensive logging
4. Blockchain fallback for immediate results
5. Utilities to check and re-sync data

Choose Option 1 (blockchain fallback) for immediate results, or Option 2 (re-sync) for complete and accurate data.
