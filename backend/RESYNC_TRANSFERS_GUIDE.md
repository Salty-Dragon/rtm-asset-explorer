# Transfer Resync Guide

This guide explains how to use the `resync-transfers.js` script to fix missing transfer data in the RTM Asset Explorer.

## Problem

If you're seeing:
- **0 transactions** on the homepage
- **0 transfers** on individual asset detail pages
- **"about 56 years ago"** instead of correct transfer timestamps
- Missing transfer history despite assets being synced

This indicates that transfers were not detected during the initial block sync, likely due to bugs in the original transfer detection logic or because blocks were synced before the detection logic was added.

## Solution

The `resync-transfers.js` script reprocesses all synced blocks to detect and record asset transfers **without re-downloading blocks**. This is much faster than a full resync since it uses existing block data in the database and only fetches full transaction details from the blockchain.

## Prerequisites

Before running the script:

1. **Blockchain node must be running** - The script fetches full block data from Raptoreumd
2. **Backend environment configured** - `.env` file must have valid MongoDB and RPC credentials
3. **Stop the sync daemon** - Prevent conflicts during resync (optional but recommended)

## Usage

### Basic Usage (Resync All Blocks)

```bash
cd backend
node resync-transfers.js --confirm
```

This will:
1. Clear all existing transfer records
2. Reset transfer counts on all assets
3. Process all blocks from height 0 to current
4. Detect and record all asset transfers

### Custom Block Range

To resync only a specific range of blocks:

```bash
node resync-transfers.js --from 1000000 --to 1100000 --confirm
```

This is useful if you know transfers are only missing in a specific height range.

### Custom Batch Size

To adjust processing speed vs. memory usage:

```bash
node resync-transfers.js --batch 50 --confirm
```

- **Smaller batches** (25-50): Lower memory usage, more progress updates
- **Larger batches** (100-200): Faster processing, higher memory usage

Default batch size is 100.

### Combining Options

```bash
node resync-transfers.js --from 500000 --to 1000000 --batch 75 --confirm
```

## What the Script Does

1. **Validates environment** - Checks MongoDB connection and blockchain availability
2. **Shows current state** - Displays asset counts, transfer counts, and block heights
3. **Confirms operation** - Requires `--confirm` flag to prevent accidental execution
4. **Clears transfer data** - Deletes all records from `asset_transfers` collection
5. **Resets asset counts** - Sets `transferCount` and `mintCount` to 0 on all assets
6. **Processes blocks** - For each block in range:
   - Fetches full block from blockchain (with transactions)
   - Processes each transaction through asset handlers
   - Detects and records mints (type 10) and transfers (type 0 with asset vouts)
   - Updates asset transfer counts
7. **Shows results** - Displays total transfers found, time taken, and processing rate

## Output Example

```
================================================
RTM Asset Explorer - Resync Transfers
================================================

Connecting to MongoDB...
✓ Connected to MongoDB

Checking blockchain connection...
✓ Connected to blockchain: main at block 1282233

Current State:
  Assets:           3,304
  Asset Transfers:  0
  Blocks Synced:    1,282,233
  Current Height:   1,282,233

Resync Configuration:
  From block:       0
  To block:         1,282,233
  Total blocks:     1,282,234
  Batch size:       100
  Confirmed:        YES

⚠️  WARNING: This will clear and rebuild transfer data!
   - All AssetTransfer records will be DELETED
   - Asset transferCount and mintCount will be RESET
   - Blocks will be re-fetched from blockchain and reprocessed
   - This operation may take a long time for many blocks

Proceeding in 3 seconds... (Ctrl+C to cancel)

================================================
STARTING TRANSFER RESYNC
================================================

Step 1: Clearing existing transfer data...
✓ Deleted 0 transfers

Step 2: Resetting asset transfer and mint counts...
✓ Reset asset counts

Step 3: Reprocessing blocks for transfer detection...
─────────────────────────────────────────────────

Processing blocks 0 - 99...
  ✓ Block 42: 1 transfers, 0 mints
  Progress: 100 blocks processed, 15 transfers, 5 mints (25.50 blocks/sec, ETA: 83.7 min)
Processing blocks 100 - 199...
  ✓ Block 156: 2 transfers, 1 mints
  ...

================================================
RESYNC COMPLETE
================================================

Results:
  Blocks processed:     1,282,234
  Transfers found:      4,523
  Mints found:          3,304
  Errors encountered:   0
  Time taken:           85.32 minutes
  Average rate:         250.45 blocks/sec

Final State:
  Total transfers:      7,827
  Assets with activity: 3,156

✅ Transfer resync completed successfully!

Next steps:
1. Run check-transfer-data.js to verify results
2. Check the application to see if transfers are now displaying
================================================
```

## Verification

After running the resync script, verify the results:

```bash
# Check transfer data
node check-transfer-data.js

# Expected output should show:
# - Asset Transfers: (non-zero count)
# - Assets with transfers: (non-zero count)
# - Mints and Transfers breakdown
```

Then check the web application:
- Homepage should show transaction count
- Individual asset pages should show transfers in sidebar
- Transfer history should display correct timestamps
- Amounts should be human-readable

## Performance

Typical processing rates on a modern system:
- **Fast SSD + Local node**: 200-300 blocks/sec
- **HDD + Remote node**: 50-100 blocks/sec
- **Slow connection**: 10-25 blocks/sec

For the full Raptoreum blockchain (~1.3M blocks):
- **Fast**: ~60-90 minutes
- **Medium**: ~3-4 hours
- **Slow**: ~15-20 hours

## Troubleshooting

### "Blockchain not available" Error

```
❌ Blockchain not available: RPC call failed
```

**Solution:** Ensure Raptoreumd is running and RPC credentials in `.env` are correct:
```bash
RAPTOREUMD_HOST=127.0.0.1
RAPTOREUMD_PORT=10225
RAPTOREUMD_USER=your_rpc_user
RAPTOREUMD_PASSWORD=your_rpc_password
```

### "MONGODB_URI not found" Error

```
❌ MONGODB_URI not found in environment variables
```

**Solution:** Check that `.env` file exists in the `backend` directory and contains:
```bash
MONGODB_URI=mongodb://localhost:27017/rtm-asset-explorer
```

### Script Hangs or Stalls

**Causes:**
- Blockchain node not responding
- Network issues
- Database connection timeout

**Solution:**
- Check blockchain node logs
- Restart Raptoreumd
- Check MongoDB connection
- Use smaller batch size: `--batch 25`

### High Memory Usage

**Solution:** Use smaller batch size:
```bash
node resync-transfers.js --batch 25 --confirm
```

### Process Interrupted (Ctrl+C)

The script can be safely interrupted and restarted. However:
- Transfer data will be in an inconsistent state
- Run the script again from the beginning with `--confirm`
- Or use `--from <height>` to continue from where it stopped

## Safety

The script is designed to be safe:
- ✅ Requires `--confirm` flag to prevent accidental execution
- ✅ Shows 3-second countdown before starting
- ✅ Does not modify block data (only transfer records)
- ✅ Does not affect sync daemon (can run concurrently, but not recommended)
- ✅ Can be interrupted and restarted

## When to Run

Run the resync script when:
- First deploying this fix
- Transfer detection logic has been improved
- Database was restored from old backup
- Transfer data appears incomplete or missing

## Notes

- **Not a substitute for sync daemon** - This script only reprocesses existing blocks
- **Requires full node** - Cannot work with pruned blockchain
- **Progress saved continuously** - Transfer records are saved as they're detected
- **Idempotent** - Safe to run multiple times (will clear and rebuild each time)

## Alternative: Force Full Resync

If you prefer to resync everything from scratch (blocks, transactions, transfers):

```bash
node force-resync.js --from 0 --clear-all --confirm
```

This will:
- Delete all blocks, transactions, and transfers
- Reset sync state to block 0
- Require the sync daemon to re-download and process all blocks

**Note:** This is much slower than `resync-transfers.js` since it re-downloads blocks.
