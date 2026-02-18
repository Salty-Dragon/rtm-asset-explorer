# Sub-Asset Sync Fix - Implementation Summary

## Overview

This document summarizes the changes made to fix the critical issue where sub-assets (assets with `|` in their names like `NUKEBOOM|tower`) were not being saved to the MongoDB database during blockchain sync.

## Problem Statement

### Root Causes

1. **Missing `blockHash` in Transaction Records**
   - Transaction objects from `getBlock(hash, 2)` don't include a `blockhash` field
   - The sync daemon has `block.hash` but wasn't passing it to asset processor methods
   - This caused validation errors: `Transaction validation failed: blockHash: Path 'blockHash' is required.`

2. **Parent Asset Name Not Forced to Uppercase**
   - Raptoreum parent asset names are ALWAYS uppercase (e.g., `NUKEBOOM`)
   - Sub-asset parsing didn't enforce this, causing case-sensitive query mismatches
   - Database queries for parent assets would fail when looking for lowercase names

### Impact

- Asset creation transactions failed to save with validation errors
- Sub-assets were never written to the database
- The `/api/assets/:assetId/subassets` endpoint returned empty arrays
- SubAssetGrid component showed no results
- Data had to be fetched live from RPC (slow and inefficient)

## Solution Implemented

### 1. Updated `backend/src/services/assetProcessor.js`

#### Changes:
- Added `blockHash` parameter to all handler methods:
  - `handleAssetCreation(tx, blockHeight, blockTime, blockHash)`
  - `handleAssetMint(tx, blockHeight, blockTime, blockHash)`
  - `handleAssetTransfer(tx, blockHeight, blockTime, blockHash)`
  - `handleAssetUpdate(tx, blockHeight, blockTime, blockHash)`
  - `recordAssetTransaction(tx, blockHeight, blockTime, operation, assetData, blockHash)`

- Fixed parent asset name parsing (line 28):
  ```javascript
  // Before:
  parentAssetName = parts[0].trim();
  
  // After:
  parentAssetName = parts[0].trim().toUpperCase();
  ```

- Updated `recordAssetTransaction` to use the passed `blockHash` parameter (line 385):
  ```javascript
  // Before:
  blockHash: tx.blockhash || '',  // ❌ Always undefined!
  
  // After:
  blockHash: blockHash || '',      // ✓ Uses passed parameter
  ```

### 2. Updated `backend/src/services/sync-daemon.js`

#### Changes:
- Updated `processBlock` method to pass `block.hash` when calling `processTransaction`:
  ```javascript
  await this.processTransaction(tx, block.height, blockTime, block.hash);
  ```

- Updated `processTransaction` signature to accept `blockHash`:
  ```javascript
  async processTransaction(tx, blockHeight, blockTime, blockHash)
  ```

- Passed `blockHash` to all asset processor calls:
  ```javascript
  case 8: // NewAssetTx - Asset creation
    await assetProcessor.handleAssetCreation(tx, blockHeight, blockTime, blockHash);
    break;
  
  case 10: // MintAssetTx - Asset mint
    await assetProcessor.handleAssetMint(tx, blockHeight, blockTime, blockHash);
    break;
  
  // ... and so on for other asset transaction types
  ```

### 3. Created Migration Script `backend/scripts/fix-subassets.js`

This script re-processes existing blockchain data to fix historical records:

#### Features:
- ✓ Idempotent - safe to run multiple times
- ✓ Fixes transactions with empty `blockHash`
- ✓ Re-processes asset creation transactions
- ✓ Updates parent asset names to uppercase
- ✓ Creates missing sub-asset records
- ✓ Provides detailed progress and statistics

#### Usage:
```bash
cd backend
npm run fix:subassets
```

### 4. Updated `backend/package.json`

Added npm script for easy migration execution:
```json
"fix:subassets": "node scripts/fix-subassets.js"
```

## Testing

### Logic Tests

Created `backend/test-subasset-logic.js` to verify:
- ✓ Parent asset names are correctly converted to uppercase
- ✓ Sub-asset names preserve original case and spacing
- ✓ blockHash flows correctly from block → transaction → database
- ✓ Multiple pipes in sub-asset names are handled correctly

All tests pass successfully.

### Verification Queries

After running the migration, verify with these MongoDB queries:

```javascript
// Check for sub-assets
db.assets.find({ name: /\|/ }).count()  // Should return > 0
db.assets.findOne({ name: "NUKEBOOM|tower" })  // Should return the asset
db.assets.find({ isSubAsset: true }).count()  // Should return > 0

// Check parent-child linking
db.assets.findOne({ name: "NUKEBOOM|tower" })
// Should have:
// - isSubAsset: true
// - parentAssetName: "NUKEBOOM" (uppercase)
// - parentAssetId: (parent's assetId)

// Check transactions
db.transactions.find({ blockHash: "" }).count()  // Should return 0
db.transactions.find({ blockHash: null }).count()  // Should return 0
```

## Data Flow

### Before Fix
```
Block → processBlock → processTransaction(tx, height, time)
                                ↓
                       handleAssetCreation(tx, height, time)
                                ↓
                       recordAssetTransaction(..., assetData)
                                ↓
                       blockHash: tx.blockhash || '' ← ❌ ALWAYS EMPTY!
```

### After Fix
```
Block → processBlock → processTransaction(tx, height, time, block.hash)
                                ↓
                       handleAssetCreation(tx, height, time, blockHash)
                                ↓
                       recordAssetTransaction(..., assetData, blockHash)
                                ↓
                       blockHash: blockHash || '' ← ✓ CORRECT VALUE!
```

## Files Modified

1. `backend/src/services/assetProcessor.js` - Added blockHash parameter to all methods
2. `backend/src/services/sync-daemon.js` - Pass block.hash to asset processor
3. `backend/scripts/fix-subassets.js` - NEW migration script
4. `backend/package.json` - Added fix:subassets script
5. `backend/test-subasset-logic.js` - NEW test file for verification

## Backward Compatibility

- ✅ Existing code flow unchanged (only parameter added)
- ✅ No database schema changes required
- ✅ Migration script handles existing data
- ✅ Safe to deploy without data loss

## Next Steps

1. Deploy the updated code to production
2. Run the migration script: `npm run fix:subassets`
3. Verify sub-assets appear in database
4. Test the `/api/assets/:assetId/subassets` endpoint
5. Verify SubAssetGrid component displays correctly

## Success Criteria

✅ Sub-assets appear in MongoDB database  
✅ `/api/assets/:assetId/subassets` returns correct sub-assets  
✅ SubAssetGrid component displays sub-assets on parent asset pages  
✅ No transaction validation errors in sync logs  
✅ All transactions have valid `blockHash` populated  
✅ `parentAssetName` is consistently uppercase in database  

## Additional Notes

- Parent assets are always UPPERCASE only (e.g., `NUKEBOOM`)
- Sub-assets can have mixed case and spaces (e.g., `NUKEBOOM|tower`, `MOLLAH|test ASS3t`)
- Each sub-asset has a unique `assetId` (transaction hash of creation)
- Parent and sub-assets have **different** transaction IDs
- The `/subassets` API endpoint queries MongoDB, not RPC
