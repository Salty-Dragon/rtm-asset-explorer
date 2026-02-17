#!/usr/bin/env node

/**
 * Resync Transfers
 * 
 * This script reprocesses all synced blocks to detect and record asset transfers.
 * Unlike force-resync.js, this keeps existing block data and only updates transfers.
 * 
 * It works by:
 * 1. Clearing the asset_transfers collection
 * 2. Resetting transferCount and mintCount on all assets
 * 3. Iterating through all blocks in the database (or blockchain)
 * 4. Re-fetching full block data from blockchain (verbosity 2)
 * 5. Processing each transaction through assetProcessor handlers
 * 
 * OPTIONS:
 *   --from <height>    - Start from this block height (default: 0)
 *   --to <height>      - Process up to this block height (default: current)
 *   --batch <size>     - Process blocks in batches of this size (default: 100)
 *   --confirm          - Required flag to confirm operation
 * 
 * EXAMPLES:
 *   node resync-transfers.js --confirm
 *   node resync-transfers.js --from 1000000 --to 1100000 --confirm
 *   node resync-transfers.js --batch 50 --confirm
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
import Asset from './src/models/Asset.js';
import AssetTransfer from './src/models/AssetTransfer.js';
import Block from './src/models/Block.js';
import SyncState from './src/models/SyncState.js';

// Import services
import blockchainService from './src/services/blockchain.js';
import assetProcessor from './src/services/assetProcessor.js';
import { logger } from './src/utils/logger.js';

async function resyncTransfers() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let fromHeight = 0;
    let toHeight = null;
    let batchSize = 100;
    let confirmed = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--from' && args[i + 1]) {
        fromHeight = parseInt(args[i + 1]);
        i++;
      } else if (args[i] === '--to' && args[i + 1]) {
        toHeight = parseInt(args[i + 1]);
        i++;
      } else if (args[i] === '--batch' && args[i + 1]) {
        batchSize = parseInt(args[i + 1]);
        i++;
      } else if (args[i] === '--confirm') {
        confirmed = true;
      }
    }

    console.log('\n================================================');
    console.log('RTM Asset Explorer - Resync Transfers');
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

    // Check blockchain connection
    console.log('Checking blockchain connection...');
    const blockchainHealth = await blockchainService.checkHealth();
    if (blockchainHealth.status !== 'connected') {
      console.error('❌ Blockchain not available:', blockchainHealth.message);
      console.error('   Make sure Raptoreumd is running and RPC is configured correctly.');
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log(`✓ Connected to blockchain: ${blockchainHealth.chain} at block ${blockchainHealth.blocks}\n`);

    // Get current state
    const syncState = await SyncState.findOne({ service: 'blocks' });
    const currentBlockHeight = syncState?.currentBlock || 0;
    
    if (!toHeight) {
      toHeight = currentBlockHeight;
    }

    const [assetCount, transferCount, blockCount] = await Promise.all([
      Asset.countDocuments(),
      AssetTransfer.countDocuments(),
      Block.countDocuments()
    ]);

    console.log('Current State:');
    console.log(`  Assets:           ${assetCount.toLocaleString()}`);
    console.log(`  Asset Transfers:  ${transferCount.toLocaleString()}`);
    console.log(`  Blocks Synced:    ${blockCount.toLocaleString()}`);
    console.log(`  Current Height:   ${currentBlockHeight.toLocaleString()}`);

    console.log('\nResync Configuration:');
    console.log(`  From block:       ${fromHeight.toLocaleString()}`);
    console.log(`  To block:         ${toHeight.toLocaleString()}`);
    console.log(`  Total blocks:     ${(toHeight - fromHeight + 1).toLocaleString()}`);
    console.log(`  Batch size:       ${batchSize}`);
    console.log(`  Confirmed:        ${confirmed ? 'YES' : 'NO'}`);

    // Confirm
    console.log('\n⚠️  WARNING: This will clear and rebuild transfer data!');
    console.log('   - All AssetTransfer records will be DELETED');
    console.log('   - Asset transferCount and mintCount will be RESET');
    console.log('   - Blocks will be re-fetched from blockchain and reprocessed');
    console.log('   - This operation may take a long time for many blocks');

    if (!confirmed) {
      console.log('\n❌ Confirmation required! Add --confirm flag to proceed.');
      console.log('   Example: node resync-transfers.js --confirm');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\nProceeding in 3 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n================================================');
    console.log('STARTING TRANSFER RESYNC');
    console.log('================================================\n');

    // Step 1: Clear transfer data
    console.log('Step 1: Clearing existing transfer data...');
    const transfersDeleted = await AssetTransfer.deleteMany({});
    console.log(`✓ Deleted ${transfersDeleted.deletedCount.toLocaleString()} transfers\n`);

    // Step 2: Reset asset counts
    console.log('Step 2: Resetting asset transfer and mint counts...');
    await Asset.updateMany({}, {
      $set: {
        transferCount: 0,
        mintCount: 0,
        lastTransfer: null
      }
    });
    console.log('✓ Reset asset counts\n');

    // Step 3: Process blocks
    console.log('Step 3: Reprocessing blocks for transfer detection...');
    console.log('─────────────────────────────────────────────────\n');

    let processedBlocks = 0;
    let transfersFound = 0;
    let mintsFound = 0;
    let errorsCount = 0;
    const startTime = Date.now();

    for (let height = fromHeight; height <= toHeight; height += batchSize) {
      const batchStart = height;
      const batchEnd = Math.min(height + batchSize - 1, toHeight);

      console.log(`Processing blocks ${batchStart.toLocaleString()} - ${batchEnd.toLocaleString()}...`);

      for (let blockHeight = batchStart; blockHeight <= batchEnd; blockHeight++) {
        try {
          // Fetch full block from blockchain (verbosity 2 includes full tx data)
          const blockHash = await blockchainService.getBlockHash(blockHeight);
          const block = await blockchainService.getBlock(blockHash, 2);

          if (!block || !block.tx) {
            console.warn(`  ⚠️  Block ${blockHeight} has no transactions, skipping`);
            continue;
          }

          const blockTime = new Date(block.time * 1000);
          let blockTransfers = 0;
          let blockMints = 0;

          // Process each transaction in the block
          for (const tx of block.tx) {
            if (typeof tx !== 'object') {
              continue; // Skip if tx is just a txid string
            }

            const txType = tx.type || 0;

            try {
              // Route based on transaction type
              switch (txType) {
                case 8: // NewAssetTx - Asset creation
                  // Asset creation doesn't create a transfer, skip
                  break;

                case 10: // MintAssetTx - Asset mint
                  await assetProcessor.handleAssetMint(tx, blockHeight, blockTime);
                  blockMints++;
                  mintsFound++;
                  break;

                case 9: // UpdateAssetTx - Asset update
                  // Asset update doesn't create a transfer, skip
                  break;

                case 0: // Standard transaction - Check for asset transfers
                default:
                  // Check if any vout has asset transfer
                  const hasAssetTransfer = tx.vout?.some(vout =>
                    vout.scriptPubKey?.type === 'transferasset' ||
                    vout.scriptPubKey?.asset ||
                    (vout.scriptPubKey?.type === 'pubkeyhash' && vout.scriptPubKey?.asset)
                  );

                  if (hasAssetTransfer) {
                    const transfers = await assetProcessor.handleAssetTransfer(tx, blockHeight, blockTime);
                    if (transfers && Array.isArray(transfers)) {
                      blockTransfers += transfers.length;
                      transfersFound += transfers.length;
                    }
                  }
                  break;
              }
            } catch (txError) {
              console.error(`  ❌ Error processing tx ${tx.txid} in block ${blockHeight}:`, txError.message);
              errorsCount++;
            }
          }

          if (blockTransfers > 0 || blockMints > 0) {
            console.log(`  ✓ Block ${blockHeight}: ${blockTransfers} transfers, ${blockMints} mints`);
          }

          processedBlocks++;

          // Progress update every 10 blocks
          if (processedBlocks % 10 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = processedBlocks / elapsed;
            const remaining = toHeight - blockHeight;
            const eta = remaining / rate;
            console.log(`  Progress: ${processedBlocks.toLocaleString()} blocks processed, ${transfersFound.toLocaleString()} transfers, ${mintsFound.toLocaleString()} mints (${rate.toFixed(2)} blocks/sec, ETA: ${(eta / 60).toFixed(1)} min)`);
          }

        } catch (error) {
          console.error(`  ❌ Error processing block ${blockHeight}:`, error.message);
          errorsCount++;

          // Continue with next block rather than aborting entire process
          continue;
        }
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;

    console.log('\n================================================');
    console.log('RESYNC COMPLETE');
    console.log('================================================\n');
    console.log('Results:');
    console.log(`  Blocks processed:     ${processedBlocks.toLocaleString()}`);
    console.log(`  Transfers found:      ${transfersFound.toLocaleString()}`);
    console.log(`  Mints found:          ${mintsFound.toLocaleString()}`);
    console.log(`  Errors encountered:   ${errorsCount.toLocaleString()}`);
    console.log(`  Time taken:           ${(totalTime / 60).toFixed(2)} minutes`);
    console.log(`  Average rate:         ${(processedBlocks / totalTime).toFixed(2)} blocks/sec`);

    // Verify results
    const finalTransferCount = await AssetTransfer.countDocuments();
    const assetsWithTransfers = await Asset.countDocuments({ transferCount: { $gt: 0 } });

    console.log('\nFinal State:');
    console.log(`  Total transfers:      ${finalTransferCount.toLocaleString()}`);
    console.log(`  Assets with activity: ${assetsWithTransfers.toLocaleString()}`);

    console.log('\n✅ Transfer resync completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run check-transfer-data.js to verify results');
    console.log('2. Check the application to see if transfers are now displaying');
    console.log('================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resyncTransfers();
