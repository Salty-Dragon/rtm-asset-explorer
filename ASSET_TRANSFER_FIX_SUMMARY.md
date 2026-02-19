# Asset Transfer Fix Summary

## Problem
Asset transfers were being detected by the sync daemon but NOT recorded in the database. The root cause was that transaction vouts sometimes contain only `asset_id` without the `name` field, causing the transfer handler to skip processing.

### Evidence from Logs
```
[TX] ✓ Calling assetProcessor.handleAssetTransfer for 48bb3534949119f75fbdd3133692a6c99a927e6623a804da0694e65e0e977d4d
[ASSET] Found 1 asset vout(s) in tx 48bb3534949119f75fbdd3133692a6c99a927e6623a804da0694e65e0e977d4d
[ASSET] Processing 1 asset transfer(s) in tx 48bb3534949119f75fbdd3133692a6c99a927e6623a804da0694e65e0e977d4d
⚠️ No asset name in tx 48bb3534949119f75fbdd3133692a6c99a927e6623a804da0694e65e0e977d4d, vout 0
[ASSET] ✓ handleAssetTransfer completed for 48bb3534949119f75fbdd3133692a6c99a927e6623a804da0694e65e0e977d4d, processed 0 transfer(s)
```

### Transaction Vout Structure Received
```json
{
  "asset_id": "05ec6f38709449e94f764aea1ca31ea453cc8ee6b749ec90ba47ba0f52412514a[0]",
  "amount": 1
}
```

Missing field: `name`

## Solution Implemented

Modified `backend/src/services/assetProcessor.js` in the `handleAssetTransfer()` function to handle missing asset names by:

1. **Checking for asset_id when name is missing**: If `asset.name` is not present but `asset.asset_id` exists, the code now attempts to resolve the asset name from the database
2. **Parsing asset_id to remove [vout] suffix**: Asset IDs in vouts may include a suffix like `[0]`, which needs to be removed before database lookup (e.g., `"txid[0]"` → `"txid"`)
3. **Database lookup**: Query the Asset collection using the parsed assetId to retrieve the asset name
4. **Improved logging**: Added detailed logging for better diagnostics when troubleshooting asset transfers

### Code Changes

**Location**: `backend/src/services/assetProcessor.js`, lines 240-260

```javascript
// Get asset name - try direct name first, then lookup by asset_id
let assetName = asset.name;
let assetId = null;  // Will be set from asset_id lookup or from assetRecord below

if (!assetName && asset.asset_id) {
  // Parse asset_id to remove [vout] suffix if present
  // Example: "05ec6f38...2514a[0]" -> "05ec6f38...2514a"
  assetId = asset.asset_id.replace(/\[\d+\]$/, '');
  
  logger.info(`[ASSET] No name in vout, looking up asset by ID: ${assetId}`);
  
  // Look up asset in database by assetId (creation txid)
  const assetRecord = await Asset.findOne({ assetId });
  
  if (assetRecord) {
    assetName = assetRecord.name;
    logger.info(`[ASSET] ✓ Resolved asset name from ID: ${assetId} -> ${assetName}`);
  } else {
    logger.warn(`[ASSET] ✗ Asset not found in database for ID: ${assetId}`);
  }
}

if (!assetName) {
  logger.warn(`[ASSET] ✗ No asset name available for tx ${tx.txid}, vout ${vout.n} (asset_id: ${asset.asset_id || 'missing'})`);
  continue;
}
```

**Location**: `backend/src/services/assetProcessor.js`, line 306

```javascript
// Priority for assetId: parsed asset_id from vout (if available) > assetRecord.assetId > assetName fallback
await this.recordAssetTransfer({
  txid: tx.txid,
  assetId: assetId || assetRecord?.assetId || assetName,  // Updated priority
  assetName,
  from: sender,
  to: recipient,
  amount,
  type: 'transfer',
  blockHeight,
  timestamp: blockTime
});
```

## Testing

### Unit Tests Created

1. **`backend/test-asset-transfer-fix.js`**: Comprehensive test for the asset transfer fix
   - Tests module imports
   - Tests asset_id parsing logic
   - Tests database lookup functionality
   - Tests handleAssetTransfer with missing name but present asset_id

2. **`backend/test-asset-id-parsing.js`**: Focused test for asset_id parsing regex
   - Tests parsing of various asset_id formats
   - All 5 test cases pass successfully

### Running the Tests

```bash
cd backend
node test-asset-transfer-fix.js
node test-asset-id-parsing.js
```

## Security

- **CodeQL Security Scan**: Completed with 0 alerts found
- **No vulnerabilities introduced**: The database lookup uses Mongoose parameterized queries, protecting against injection attacks
- **No breaking changes**: The fix is backward compatible; transfers with `asset.name` present continue to work as before

## Verification

After deploying this fix:

1. **Restart the sync daemon**:
   ```bash
   pm2 restart sync-daemon
   ```

2. **Make a new asset transfer transaction** (or wait for one to occur)

3. **Watch the logs**:
   ```bash
   pm2 logs sync-daemon --lines 50
   ```

4. **Look for successful resolution**:
   ```
   [ASSET] No name in vout, looking up asset by ID: 05ec6f38709449e94f764aea1ca31ea453cc8ee6b749ec90ba47ba0f52412514a
   [ASSET] ✓ Resolved asset name from ID: 05ec6f38...2514a -> ASSET_NAME
   [ASSET] ✓ Recorded transfer: ASSET_NAME from RSender to RRecipient, amount: 1
   ```

## Expected Behavior

### Before Fix
- Transfers with missing asset names were logged but skipped
- Transfer count was not updated
- No transfer record was created

### After Fix
- Transfers with missing asset names trigger a database lookup
- If asset is found in database, the transfer is processed normally
- Transfer count is updated
- Transfer record is created
- Improved logging provides visibility into the resolution process

## Files Modified

1. `backend/src/services/assetProcessor.js` - Core fix implementation
2. `backend/test-asset-transfer-fix.js` - New comprehensive test
3. `backend/test-asset-id-parsing.js` - New parsing validation test

## Commits

1. `c4dd648` - Implement asset transfer fix for missing asset names
2. `485d795` - Refactor: Simplify asset ID handling per code review
3. `0c3d6a4` - Add comments to clarify assetId handling logic
