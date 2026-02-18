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
  constructor() {
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
    console.log('\nFinding blocks with asset creation transactions...');
    
    // Find all blocks that might contain asset creation txs
    // We'll look for blocks with transactions
    const blocks = await Block.find({ transactionCount: { $gt: 0 } })
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
        this.stats.assetsChecked++;

        // Check if this is a sub-asset
        if (!assetName.includes('|')) {
          continue; // Not a sub-asset
        }

        this.stats.subAssetsFound++;
        
        // Check if asset already exists
        const existingAsset = await Asset.findOne({ assetId: tx.txid });
        
        if (existingAsset) {
          // Update parent asset name to uppercase if needed
          const parts = assetName.split('|');
          const correctParentName = parts[0].trim().toUpperCase();
          
          if (existingAsset.parentAssetName !== correctParentName) {
            console.log(`  Updating parent name: ${existingAsset.parentAssetName} → ${correctParentName} for ${assetName}`);
            existingAsset.parentAssetName = correctParentName;
            
            // Re-find parent asset with correct name
            const parentAsset = await Asset.findOne({ 
              name: correctParentName, 
              isSubAsset: false 
            });
            
            if (parentAsset) {
              existingAsset.parentAssetId = parentAsset.assetId;
            }
            
            await existingAsset.save();
            this.stats.subAssetsUpdated++;
          }
        } else {
          // Asset doesn't exist, create it
          console.log(`  Creating missing sub-asset: ${assetName}`);
          
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

      // Step 1: Fix empty blockHash in existing transactions
      await this.fixEmptyBlockHashes();

      // Step 2: Find and re-process asset creation blocks
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

// Run the migration
const fixer = new SubAssetFixer();
fixer.run().then(() => {
  console.log('Migration script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
