#!/usr/bin/env node

import mongoose from 'mongoose';
import blockchainService from './blockchain.js';
import assetProcessor from './assetProcessor.js';
import futureChecker from './futureChecker.js';
import Block from '../models/Block.js';
import Transaction from '../models/Transaction.js';
import SyncState from '../models/SyncState.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class SyncDaemon {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '100');
    this.startHeight = parseInt(process.env.SYNC_START_HEIGHT || '0');
    this.retryAttempts = parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3');
    this.retryDelay = parseInt(process.env.SYNC_RETRY_DELAY || '30000');
    this.checkpointInterval = parseInt(process.env.SYNC_CHECKPOINT_INTERVAL || '100');
    // Fix: Explicitly check for 'true' to enable sync (don't default to enabled)
    this.syncEnabled = process.env.SYNC_ENABLED === 'true';
    
    // Performance tracking
    this.startTime = null;
    this.blockProcessingTimes = [];
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      logger.info('Initializing sync daemon...');
      logger.info(`Sync enabled: ${this.syncEnabled}`);
      
      // Validate required environment variables
      const requiredEnvVars = [
        'MONGODB_URI',
        'RAPTOREUMD_HOST',
        'RAPTOREUMD_PORT',
        'RAPTOREUMD_USER',
        'RAPTOREUMD_PASSWORD'
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file or PM2 configuration.`);
      }
      
      // Connect to MongoDB
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI not configured');
      }

      await mongoose.connect(mongoUri);
      logger.info('Connected to MongoDB');

      // Check blockchain connection
      const blockchainHealth = await blockchainService.checkHealth();
      if (blockchainHealth.status !== 'connected') {
        throw new Error(`Blockchain not available: ${blockchainHealth.message}`);
      }
      logger.info(`Connected to blockchain: ${blockchainHealth.chain} at block ${blockchainHealth.blocks}`);

      // Initialize sync state
      await this.initializeSyncState();
      
      logger.info('Sync daemon initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize sync daemon:', error);
      throw error;
    }
  }

  /**
   * Initialize or load sync state
   */
  async initializeSyncState() {
    let syncState = await SyncState.findOne({ service: 'blocks' });
    
    if (!syncState) {
      syncState = new SyncState({
        service: 'blocks',
        currentBlock: this.startHeight,
        startBlock: this.startHeight,
        status: 'not_started'
      });
      await syncState.save();
      logger.info(`Created new sync state starting at block ${this.startHeight}`);
    } else {
      logger.info(`Loaded existing sync state: current block ${syncState.currentBlock}, status ${syncState.status}`);
    }
    
    return syncState;
  }

  /**
   * Start the sync process
   */
  async start() {
    if (!this.syncEnabled) {
      console.warn('\n==========================================');
      console.warn('SYNC DISABLED');
      console.warn('==========================================');
      console.warn('SYNC_ENABLED is not set to "true"');
      console.warn(`Current value: ${process.env.SYNC_ENABLED}`);
      console.warn('\nTo enable sync, set SYNC_ENABLED=true in:');
      console.warn('- Your .env file, OR');
      console.warn('- PM2 ecosystem.config.js, OR');
      console.warn('- Your environment variables');
      console.warn('==========================================\n');
      
      logger.warn('Sync is disabled. Set SYNC_ENABLED=true to enable.');
      return;
    }

    if (this.isRunning) {
      logger.warn('Sync daemon is already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    logger.info('Starting sync daemon...');

    try {
      while (this.isRunning) {
        if (this.isPaused) {
          logger.info('Sync is paused, waiting...');
          await this.sleep(10000);
          continue;
        }

        await this.syncLoop();
        
        // Small delay between batches
        await this.sleep(1000);
      }
    } catch (error) {
      logger.error('Sync daemon error:', error);
      await this.updateSyncState({ status: 'error', lastError: error.message });
      
      // Retry after delay
      if (this.isRunning && this.retryAttempts > 0) {
        this.retryAttempts--;
        logger.info(`Retrying in ${this.retryDelay / 1000} seconds... (${this.retryAttempts} attempts remaining)`);
        await this.sleep(this.retryDelay);
        await this.start(); // Recursive restart
      } else {
        logger.error('Max retry attempts reached, stopping sync daemon');
        this.isRunning = false;
      }
    }
  }

  /**
   * Main sync loop
   */
  async syncLoop() {
    try {
      // Get current sync state
      const syncState = await SyncState.findOne({ service: 'blocks' });
      const currentBlock = syncState?.currentBlock || this.startHeight;
      
      // Get blockchain info
      const blockchainInfo = await blockchainService.getBlockchainInfo();
      const targetBlock = blockchainInfo.blocks;
      
      // Update target
      await this.updateSyncState({ targetBlock });
      
      // Check if synced
      if (currentBlock >= targetBlock) {
        if (syncState?.status !== 'synced') {
          logger.info(`Sync complete! At block ${currentBlock}`);
          await this.updateSyncState({ status: 'synced' });
        }
        
        // Check for new blocks every 30 seconds
        await this.sleep(30000);
        return;
      }
      
      // Calculate batch
      const endBlock = Math.min(currentBlock + this.batchSize, targetBlock);
      
      logger.info(`Syncing blocks ${currentBlock + 1} to ${endBlock} (${endBlock - currentBlock} blocks)`);
      
      // Update status to syncing
      if (syncState?.status !== 'syncing') {
        await this.updateSyncState({ status: 'syncing' });
      }
      
      // Sync batch
      await this.syncBlocks(currentBlock + 1, endBlock);
      
      // Update progress
      await this.updateSyncState({
        currentBlock: endBlock,
        lastSyncedAt: new Date()
      });
      
      // Check and unlock mature futures
      await futureChecker.checkAndUnlockMatureFutures(endBlock, new Date());
      
    } catch (error) {
      logger.error('Error in sync loop:', error);
      throw error;
    }
  }

  /**
   * Sync a range of blocks
   */
  async syncBlocks(startHeight, endHeight) {
    for (let height = startHeight; height <= endHeight; height++) {
      const blockStartTime = Date.now();
      
      try {
        await this.syncBlock(height);
        
        const blockTime = Date.now() - blockStartTime;
        this.blockProcessingTimes.push(blockTime);
        
        // Keep only last 100 times for average calculation
        if (this.blockProcessingTimes.length > 100) {
          this.blockProcessingTimes.shift();
        }
        
        // Log progress every 10 blocks
        if (height % 10 === 0) {
          const avgTime = this.blockProcessingTimes.reduce((a, b) => a + b, 0) / this.blockProcessingTimes.length;
          logger.info(`Processed block ${height} in ${blockTime}ms (avg: ${avgTime.toFixed(0)}ms)`);
        }
        
        // Checkpoint every N blocks
        if (height % this.checkpointInterval === 0) {
          await this.updateSyncState({
            currentBlock: height,
            averageBlockTime: this.blockProcessingTimes.reduce((a, b) => a + b, 0) / this.blockProcessingTimes.length
          });
        }
        
      } catch (error) {
        logger.error(`Error syncing block ${height}:`, error);
        
        // Retry logic
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
          logger.info(`Retry attempt ${attempt}/${this.retryAttempts} for block ${height}`);
          await this.sleep(5000 * attempt);
          
          try {
            await this.syncBlock(height);
            logger.info(`Successfully synced block ${height} on retry ${attempt}`);
            break;
          } catch (retryError) {
            if (attempt === this.retryAttempts) {
              logger.error(`Failed to sync block ${height} after ${this.retryAttempts} attempts`);
              throw retryError;
            }
          }
        }
      }
    }
  }

  /**
   * Sync a single block
   */
  async syncBlock(height) {
    try {
      // Check if block already exists
      const existingBlock = await Block.findOne({ height });
      if (existingBlock) {
        logger.debug(`Block ${height} already synced, skipping`);
        return;
      }

      // Fetch block from blockchain
      const blockHash = await blockchainService.getBlockHash(height);
      const block = await blockchainService.getBlock(blockHash, 2); // Verbosity 2 includes transactions
      
      if (!block) {
        throw new Error(`Failed to fetch block ${height}`);
      }

      // Process block
      await this.processBlock(block);
      
    } catch (error) {
      logger.error(`Error syncing block ${height}:`, error);
      throw error;
    }
  }

  /**
   * Process a block and its transactions
   */
  async processBlock(block) {
    try {
      const blockTime = new Date(block.time * 1000);
      
      // Save block record
      const blockDoc = new Block({
        height: block.height,
        hash: block.hash,
        previousHash: block.previousblockhash || '',
        merkleRoot: block.merkleroot,
        timestamp: blockTime,
        difficulty: block.difficulty,
        nonce: block.nonce,
        size: block.size,
        transactionCount: block.tx?.length || 0,
        transactions: (block.tx || []).map(tx => typeof tx === 'string' ? tx : tx.txid),
        miner: block.tx?.[0]?.vout?.[0]?.scriptPubKey?.addresses?.[0] || '',
        reward: block.tx?.[0]?.vout?.[0]?.value || 0,
        confirmations: block.confirmations || 0
      });
      
      await blockDoc.save();
      
      // Process transactions
      if (block.tx && Array.isArray(block.tx)) {
        for (const tx of block.tx) {
          if (typeof tx === 'object') {
            await this.processTransaction(tx, block.height, blockTime);
          }
        }
      }
      
      logger.debug(`Processed block ${block.height} with ${block.tx?.length || 0} transactions`);
      
    } catch (error) {
      // If duplicate block, ignore
      if (error.code === 11000) {
        logger.debug(`Block ${block.height} already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Process a transaction and route to appropriate handler
   */
  async processTransaction(tx, blockHeight, blockTime) {
    try {
      const txType = tx.type || 0;
      
      // Route based on transaction type
      switch (txType) {
        case 8: // NewAssetTx - Asset creation
          await assetProcessor.handleAssetCreation(tx, blockHeight, blockTime);
          break;
          
        case 10: // MintAssetTx - Asset mint
          await assetProcessor.handleAssetMint(tx, blockHeight, blockTime);
          break;
          
        case 9: // UpdateAssetTx - Asset update
          await assetProcessor.handleAssetUpdate(tx, blockHeight, blockTime);
          break;
          
        case 7: // FutureTx - Future lock
          await futureChecker.handleFutureTransaction(tx, blockHeight, blockTime);
          break;
          
        case 0: // Standard transaction - Check for asset transfers
        default:
          // Check if any vout has asset transfer
          const hasAssetTransfer = tx.vout?.some(vout => 
            vout.scriptPubKey?.type === 'transferasset'
          );
          
          if (hasAssetTransfer) {
            await assetProcessor.handleAssetTransfer(tx, blockHeight, blockTime);
          }
          break;
      }
      
    } catch (error) {
      logger.error(`Error processing transaction ${tx.txid}:`, error);
      // Don't throw - continue processing other transactions
    }
  }

  /**
   * Update sync state
   */
  async updateSyncState(updates) {
    try {
      await SyncState.findOneAndUpdate(
        { service: 'blocks' },
        { $set: updates },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error('Error updating sync state:', error);
    }
  }

  /**
   * Pause sync
   */
  pause() {
    this.isPaused = true;
    logger.info('Sync daemon paused');
  }

  /**
   * Resume sync
   */
  resume() {
    this.isPaused = false;
    logger.info('Sync daemon resumed');
  }

  /**
   * Stop sync
   */
  async stop() {
    logger.info('Stopping sync daemon...');
    this.isRunning = false;
    await this.updateSyncState({ status: 'paused' });
    logger.info('Sync daemon stopped');
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
const daemon = new SyncDaemon();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await daemon.stop();
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await daemon.stop();
  await mongoose.disconnect();
  process.exit(0);
});

// Start daemon
(async () => {
  try {
    console.log('==========================================');
    console.log('RTM Asset Explorer - Sync Daemon Starting');
    console.log('==========================================');
    console.log(`SYNC_ENABLED: ${process.env.SYNC_ENABLED}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`Working Directory: ${process.cwd()}`);
    console.log('==========================================\n');
    
    await daemon.initialize();
    await daemon.start();
  } catch (error) {
    console.error('\n==========================================');
    console.error('FATAL ERROR: Failed to start sync daemon');
    console.error('==========================================');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('\nPlease check:');
    console.error('1. MongoDB is running and MONGODB_URI is correct');
    console.error('2. Raptoreumd is running and RPC credentials are correct');
    console.error('3. SYNC_ENABLED is set to "true" in your environment');
    console.error('4. All required environment variables are set');
    console.error('==========================================\n');
    
    logger.error('Failed to start sync daemon:', error);
    process.exit(1);
  }
})();

export default daemon;
