#!/usr/bin/env node

/**
 * Fix Sub-Assets Migration Script
 * 
 * This script re-processes asset creation transactions to:
 * 1. Populate missing sub-assets in the database
 * 2. Fix transactions with empty blockHash
 * 3. Ensure parent asset names are uppercase
 * 
 * The script is idempotent - safe to run multiple times
 * 
 * OPTIONS:
 *   --from <height>    - Start from this block height (default: 850000, when assets started)
 *   --to <height>      - Process up to this block height (default: current)
 *   --confirm          - Required flag to confirm operation
 * 
 * EXAMPLES:
 *   node backend/scripts/fix-subassets.js --from 850000 --confirm
 *   node backend/scripts/fix-subassets.js --from 850000 --to 1000000 --confirm
 */

import mongoose from 'mongoose';
import Asset from '../src/models/Asset.js';
import Transaction from '../src/models/Transaction.js';
import Block from '../src/models/Block.js';
import { logger } from '../src/utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

class SubAssetFixer {
  constructor(fromHeight = 850000, toHeight = null) {
    this.fromHeight = fromHeight;
    this.toHeight = toHeight;
    this.blockchainService = null;
    this.assetProcessor = null;
    this.stats = {
      assetsChecked: 0,
      subAssetsFound: 0,
      subAssetsCreated: 0,
      subAssetsUpdated: 0,
      transactionsFixed: 0,
      errors: 0
    };
  }

  /**
   * Initialize database and blockchain connections
   */
  async initialize() {
    try {
      console.log('Initializing migration script...');
      
      // Connect to MongoDB
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI not configured');
      }

      await mongoose.connect(mongoUri);
      console.log('✓ Connected to MongoDB');

      // Dynamically import services AFTER env vars are loaded
      const blockchainModule = await import('../src/services/blockchain.js');
      this.blockchainService = blockchainModule.default;
      
      const assetProcessorModule = await import('../src/services/assetProcessor.js');
      this.assetProcessor = assetProcessorModule.default;

      // Check blockchain connection
      const blockchainHealth = await this.blockchainService.checkHealth();
      if (blockchainHealth.status !== 'connected') {
        throw new Error(`Blockchain not available: ${blockchainHealth.message}`);
      }
      console.log(`✓ Connected to blockchain: ${blockchainHealth.chain} at block ${blockchainHealth.blocks}`);

      return true;
    } catch (error) {
      console.error('Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Find all blocks containing asset creation transactions
   */
  async findAssetCreationBlocks() {
    console.log(`\nFinding blocks with asset creation transactions (height ${this.fromHeight} to ${this.toHeight || 'current'})...`);
    
    // Build query with height range
    const query = { 
      transactionCount: { $gt: 0 },
      height: { $gte: this.fromHeight }
    };
    
    if (this.toHeight !== null) {
      query.height.$lte = this.toHeight;
    }
    
    const blocks = await Block.find(query)
      .sort({ height: 1 })
      .lean();
    
    console.log(`Found ${blocks.length} blocks to check`);
    return blocks;
  }

  /**
   * Re-process a block's transactions for asset creations
   */
  async reprocessBlock(blockData) {
    try {
      // Fetch full block with transactions from blockchain
      const block = await this.blockchainService.getBlock(blockData.hash, 2);
      
      if (!block || !block.tx) {
        return 0;
      }

      let processedCount = 0;

      for (const tx of block.tx) {
        if (typeof tx !== 'object' || tx.type !== 8) {
          continue; // Skip non-asset-creation transactions
        }

        if (!tx.newAssetTx) {
          continue;
        }

        const assetName = tx.newAssetTx.name;
        const isRoot = tx.newAssetTx.isRoot;
        const rootId = tx.newAssetTx.rootId;
        this.stats.assetsChecked++;

        // Check if this is a sub-asset using isRoot field
        if (isRoot !== false) {
          continue; // Not a sub-asset
        }

        this.stats.subAssetsFound++;
        
        // Get sub-asset name (without parent prefix)
        const subAssetName = assetName.trim();
        
        // Find parent asset by rootId
        const parentAsset = await Asset.findOne({ assetId: rootId });
        
        if (!parentAsset) {
          console.log(`  ⚠️  Parent asset not found for sub-asset ${assetName} (rootId: ${rootId})`);
          this.stats.errors++;
          continue;
        }
        
        const parentAssetName = parentAsset.name.toUpperCase();
        const fullAssetName = `${parentAssetName}|${subAssetName}`;
        
        // Check if asset already exists
        const existingAsset = await Asset.findOne({ assetId: tx.txid });
        
        if (existingAsset) {
          // Asset exists but might have wrong name/flags
          let needsUpdate = false;
          
          if (existingAsset.name !== fullAssetName) {
            console.log(`  Fixing asset name: ${existingAsset.name} → ${fullAssetName}`);
            existingAsset.name = fullAssetName;
            needsUpdate = true;
          }
          
          if (existingAsset.isSubAsset !== true) {
            console.log(`  Setting isSubAsset flag for ${fullAssetName}`);
            existingAsset.isSubAsset = true;
            needsUpdate = true;
          }
          
          if (existingAsset.parentAssetName !== parentAssetName) {
            console.log(`  Updating parent name: ${existingAsset.parentAssetName} → ${parentAssetName}`);
            existingAsset.parentAssetName = parentAssetName;
            needsUpdate = true;
          }
          
          if (existingAsset.subAssetName !== subAssetName) {
            existingAsset.subAssetName = subAssetName;
            needsUpdate = true;
          }
          
          if (existingAsset.parentAssetId !== parentAsset.assetId) {
            existingAsset.parentAssetId = parentAsset.assetId;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            await existingAsset.save();
            this.stats.subAssetsUpdated++;
          }
        } else {
          // Asset doesn't exist, create it with correct data
          console.log(`  Creating missing sub-asset: ${fullAssetName}`);
          
          const blockTime = new Date(block.time * 1000);
          await this.assetProcessor.handleAssetCreation(tx, block.height, blockTime, block.hash);
          this.stats.subAssetsCreated++;
          processedCount++;
        }

        // Fix transaction if blockHash is empty
        const existingTx = await Transaction.findOne({ txid: tx.txid });
        if (existingTx && (!existingTx.blockHash || existingTx.blockHash === '')) {
          console.log(`  Fixing transaction blockHash: ${tx.txid}`);
          existingTx.blockHash = block.hash;
          await existingTx.save();
          this.stats.transactionsFixed++;
        }
      }

      return processedCount;
    } catch (error) {
      console.error(`Error processing block ${blockData.height}:`, error.message);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Fix existing assets that were incorrectly saved without parent names
   */
  async fixMisnamedSubAssets() {
    console.log('\nSearching for incorrectly saved sub-assets...');
    
    // Find all asset creation transactions from blockchain
    const blocks = await this.findAssetCreationBlocks();
    let fixedCount = 0;
    
    for (const blockData of blocks) {
      const block = await this.blockchainService.getBlock(blockData.hash, 2);
      if (!block || !block.tx) continue;
      
      for (const tx of block.tx) {
        if (tx.type !== 8 || !tx.newAssetTx) continue;
        
        const { name, isRoot, rootId } = tx.newAssetTx;
        
        // Only process sub-assets
        if (isRoot !== false) continue;
        
        // Find the asset in database
        const asset = await Asset.findOne({ assetId: tx.txid });
        if (!asset) continue;
        
        // Check if it's incorrectly saved (name doesn't contain pipe)
        if (asset.name.includes('|')) continue;
        
        // This is a sub-asset saved with wrong name
        const parentAsset = await Asset.findOne({ assetId: rootId });
        if (!parentAsset) {
          console.log(`  ⚠️  Cannot fix ${asset.name}: parent not found (rootId: ${rootId})`);
          continue;
        }
        
        const correctName = `${parentAsset.name.toUpperCase()}|${name.trim()}`;
        console.log(`  Fixing: "${asset.name}" → "${correctName}"`);
        
        asset.name = correctName;
        asset.isSubAsset = true;
        asset.parentAssetName = parentAsset.name.toUpperCase();
        asset.subAssetName = name.trim();
        asset.parentAssetId = parentAsset.assetId;
        
        await asset.save();
        fixedCount++;
      }
    }
    
    console.log(`\n✓ Fixed ${fixedCount} misnamed sub-assets`);
    return fixedCount;
  }

  /**
   * Fix transactions with empty blockHash
   */
  async fixEmptyBlockHashes() {
    console.log('\nFixing transactions with empty blockHash...');
    
    const emptyHashTxs = await Transaction.find({
      $or: [
        { blockHash: '' },
        { blockHash: null },
        { blockHash: { $exists: false } }
      ]
    }).limit(1000); // Process in batches
    
    console.log(`Found ${emptyHashTxs.length} transactions with empty blockHash`);
    
    for (const tx of emptyHashTxs) {
      try {
        // Find the block at this height
        const block = await Block.findOne({ height: tx.blockHeight });
        
        if (block) {
          tx.blockHash = block.hash;
          await tx.save();
          this.stats.transactionsFixed++;
          
          if (this.stats.transactionsFixed % 100 === 0) {
            console.log(`  Fixed ${this.stats.transactionsFixed} transactions...`);
          }
        }
      } catch (error) {
        console.error(`Error fixing tx ${tx.txid}:`, error.message);
        this.stats.errors++;
      }
    }
  }

  /**
   * Run the migration
   */
  async run() {
    console.log('\n========================================');
    console.log('Sub-Asset Migration Script');
    console.log('========================================\n');

    try {
      await this.initialize();

      // Step 1: Fix misnamed sub-assets that were already saved
      await this.fixMisnamedSubAssets();

      // Step 2: Fix empty blockHash in existing transactions
      await this.fixEmptyBlockHashes();

      // Step 3: Find and re-process asset creation blocks
      const blocks = await this.findAssetCreationBlocks();
      
      console.log('\nRe-processing blocks for sub-assets...');
      let processedBlocks = 0;
      
      for (const block of blocks) {
        if (processedBlocks % 100 === 0 && processedBlocks > 0) {
          console.log(`Progress: Processed ${processedBlocks}/${blocks.length} blocks...`);
        }
        
        await this.reprocessBlock(block);
        processedBlocks++;
      }

      // Print summary
      console.log('\n========================================');
      console.log('Migration Complete!');
      console.log('========================================');
      console.log(`Assets checked: ${this.stats.assetsChecked}`);
      console.log(`Sub-assets found on blockchain: ${this.stats.subAssetsFound}`);
      console.log(`Sub-assets created: ${this.stats.subAssetsCreated}`);
      console.log(`Sub-assets updated: ${this.stats.subAssetsUpdated}`);
      console.log(`Transactions fixed: ${this.stats.transactionsFixed}`);
      console.log(`Errors: ${this.stats.errors}`);
      console.log('========================================\n');

      // Verification queries
      console.log('Running verification queries...\n');
      
      const subAssetCount = await Asset.countDocuments({ isSubAsset: true });
      console.log(`✓ Sub-assets in database: ${subAssetCount}`);
      
      const emptyBlockHashCount = await Transaction.countDocuments({ 
        $or: [{ blockHash: '' }, { blockHash: null }] 
      });
      console.log(`✓ Transactions with empty blockHash: ${emptyBlockHashCount}`);
      
      const sampleSubAsset = await Asset.findOne({ isSubAsset: true });
      if (sampleSubAsset) {
        console.log(`\nSample sub-asset:`);
        console.log(`  Name: ${sampleSubAsset.name}`);
        console.log(`  Parent: ${sampleSubAsset.parentAssetName}`);
        console.log(`  Parent ID: ${sampleSubAsset.parentAssetId}`);
      }

    } catch (error) {
      console.error('\nMigration failed:', error);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('\nDisconnected from database');
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let fromHeight = 850000;  // Default: when assets started on Raptoreum
let toHeight = null;      // Default: current blockchain height
let confirmed = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--from' && args[i + 1]) {
    fromHeight = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--to' && args[i + 1]) {
    toHeight = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--confirm') {
    confirmed = true;
  }
}

// Validate parsed arguments
if (isNaN(fromHeight) || fromHeight < 0) {
  console.error('❌ Invalid --from value. Must be a positive number.');
  console.error('\nExamples:');
  console.error('  node backend/scripts/fix-subassets.js --from 850000 --confirm');
  console.error('  node backend/scripts/fix-subassets.js --from 850000 --to 1000000 --confirm');
  process.exit(1);
}

if (toHeight !== null && (isNaN(toHeight) || toHeight < 0)) {
  console.error('❌ Invalid --to value. Must be a positive number.');
  console.error('\nExamples:');
  console.error('  node backend/scripts/fix-subassets.js --from 850000 --confirm');
  console.error('  node backend/scripts/fix-subassets.js --from 850000 --to 1000000 --confirm');
  process.exit(1);
}

if (toHeight !== null && fromHeight > toHeight) {
  console.error('❌ Invalid range: --from must be less than or equal to --to');
  console.error(`   Current values: --from ${fromHeight} --to ${toHeight}`);
  console.error('\nExamples:');
  console.error('  node backend/scripts/fix-subassets.js --from 850000 --confirm');
  console.error('  node backend/scripts/fix-subassets.js --from 850000 --to 1000000 --confirm');
  process.exit(1);
}

if (!confirmed) {
  console.error('❌ This script will re-process asset creation transactions.');
  console.error('   Use --confirm flag to proceed.');
  console.error('\nExamples:');
  console.error('  node backend/scripts/fix-subassets.js --from 850000 --confirm');
  console.error('  node backend/scripts/fix-subassets.js --from 850000 --to 1000000 --confirm');
  process.exit(1);
}

// Run the migration with specified range
const fixer = new SubAssetFixer(fromHeight, toHeight);
fixer.run().then(() => {
  console.log('Migration script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
