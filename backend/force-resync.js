#!/usr/bin/env node

/**
 * Force Re-sync
 * 
 * This script resets the sync state to force the sync daemon to re-process blocks.
 * Use this when transfer detection logic has been fixed and you need to re-scan blocks.
 * 
 * OPTIONS:
 *   --from <height>    - Start re-syncing from this block height (default: 0)
 *   --clear-transfers  - Clear existing AssetTransfer records before re-sync
 *   --clear-all        - Clear all synced data (blocks, transactions, transfers)
 *   --confirm          - Required flag to confirm destructive operation
 * 
 * EXAMPLES:
 *   node force-resync.js --from 0 --clear-transfers --confirm
 *   node force-resync.js --from 1000000 --confirm
 *   node force-resync.js --clear-all --confirm
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import models
import AssetTransfer from './src/models/AssetTransfer.js';
import Transaction from './src/models/Transaction.js';
import Block from './src/models/Block.js';
import SyncState from './src/models/SyncState.js';
import Asset from './src/models/Asset.js';

async function forceResync() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let fromHeight = 0;
    let clearTransfers = false;
    let clearAll = false;
    let confirmed = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--from' && args[i + 1]) {
        fromHeight = parseInt(args[i + 1]);
        i++;
      } else if (args[i] === '--clear-transfers') {
        clearTransfers = true;
      } else if (args[i] === '--clear-all') {
        clearAll = true;
      } else if (args[i] === '--confirm') {
        confirmed = true;
      }
    }

    console.log('\n================================================');
    console.log('RTM Asset Explorer - Force Re-sync');
    console.log('================================================\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Show current state
    const syncState = await SyncState.findOne({ service: 'blocks' });
    const [assetCount, transferCount, txCount, blockCount] = await Promise.all([
      Asset.countDocuments(),
      AssetTransfer.countDocuments(),
      Transaction.countDocuments(),
      Block.countDocuments()
    ]);

    console.log('Current State:');
    console.log(`  Assets:           ${assetCount.toLocaleString()}`);
    console.log(`  Asset Transfers:  ${transferCount.toLocaleString()}`);
    console.log(`  Transactions:     ${txCount.toLocaleString()}`);
    console.log(`  Blocks:           ${blockCount.toLocaleString()}`);
    if (syncState) {
      console.log(`  Sync Block:       ${syncState.currentBlock?.toLocaleString() || 'N/A'}`);
    }

    console.log('\nRe-sync Configuration:');
    console.log(`  Start from block: ${fromHeight.toLocaleString()}`);
    console.log(`  Clear transfers:  ${clearTransfers ? 'YES' : 'NO'}`);
    console.log(`  Clear all data:   ${clearAll ? 'YES' : 'NO'}`);
    console.log(`  Confirmed:        ${confirmed ? 'YES' : 'NO'}`);

    // Confirm
    console.log('\n⚠️  WARNING: This will reset sync state and may delete data!');
    console.log('   The sync daemon will re-process blocks starting from block', fromHeight);
    
    if (clearTransfers) {
      console.log('   ALL AssetTransfer records will be DELETED');
    }
    
    if (clearAll) {
      console.log('   ALL synced data (blocks, transactions, transfers) will be DELETED');
    }

    if (!confirmed) {
      console.log('\n❌ Confirmation required! Add --confirm flag to proceed.');
      console.log('   Example: node force-resync.js --from 0 --clear-transfers --confirm');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\nProceeding in 3 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\nExecuting re-sync setup...\n');

    // Clear data if requested
    if (clearAll) {
      console.log('Deleting all blocks...');
      const blocksDeleted = await Block.deleteMany({});
      console.log(`✓ Deleted ${blocksDeleted.deletedCount} blocks`);

      console.log('Deleting all transactions...');
      const txDeleted = await Transaction.deleteMany({});
      console.log(`✓ Deleted ${txDeleted.deletedCount} transactions`);

      console.log('Deleting all asset transfers...');
      const transfersDeleted = await AssetTransfer.deleteMany({});
      console.log(`✓ Deleted ${transfersDeleted.deletedCount} transfers`);

      // Reset asset transfer counts
      console.log('Resetting asset transfer counts...');
      await Asset.updateMany({}, { $set: { transferCount: 0, lastTransfer: null } });
      console.log('✓ Reset asset transfer counts');
    } else if (clearTransfers) {
      console.log('Deleting asset transfers...');
      const transfersDeleted = await AssetTransfer.deleteMany({});
      console.log(`✓ Deleted ${transfersDeleted.deletedCount} transfers`);

      // Reset asset transfer counts
      console.log('Resetting asset transfer counts...');
      await Asset.updateMany({}, { $set: { transferCount: 0, lastTransfer: null } });
      console.log('✓ Reset asset transfer counts');
    }

    // Reset sync state
    console.log(`\nResetting sync state to block ${fromHeight}...`);
    await SyncState.findOneAndUpdate(
      { service: 'blocks' },
      {
        $set: {
          currentBlock: fromHeight,
          status: 'pending',
          lastSyncedAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log('✓ Sync state reset');

    console.log('\n✅ Re-sync setup complete!');
    console.log('\nNext steps:');
    console.log('1. Restart the sync daemon (if running)');
    console.log('2. Watch logs to ensure transfers are being detected');
    console.log('3. Run check-transfer-data.js to verify results');
    console.log('\nThe sync daemon will now re-process blocks starting from', fromHeight);
    console.log('================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

forceResync();
