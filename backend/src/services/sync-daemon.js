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
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
const envPath = path.resolve(__dirname, '../../.env');
console.log(`[ENV] Loading environment from: ${envPath}`);
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  console.warn(`[ENV WARNING] Could not load .env file from ${envPath}:`, envResult.error.message);
  console.warn('[ENV WARNING] Will use environment variables from system or PM2 config');
} else {
  console.log('[ENV] Environment variables loaded successfully');
}

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
      console.log('\n[SYNC INIT] Starting initialization...');
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
      
      console.log('[SYNC INIT] Checking required environment variables...');
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]?.trim());
      if (missingVars.length > 0) {
        const error = new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file or PM2 configuration.`);
        console.error('[SYNC INIT ERROR]', error.message);
        throw error;
      }
      console.log('[SYNC INIT] All required environment variables present');
      
      // Connect to MongoDB
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        const error = new Error('MONGODB_URI not configured');
        console.error('[SYNC INIT ERROR]', error.message);
        throw error;
      }

      console.log('[SYNC INIT] Connecting to MongoDB...');
      await mongoose.connect(mongoUri);
      logger.info('Connected to MongoDB');
      console.log('[SYNC INIT] MongoDB connected successfully');

      // Check blockchain connection
      console.log('[SYNC INIT] Checking blockchain connection...');
      const blockchainHealth = await blockchainService.checkHealth();
      if (blockchainHealth.status !== 'connected') {
        const error = new Error(`Blockchain not available: ${blockchainHealth.message}`);
        console.error('[SYNC INIT ERROR]', error.message);
        throw error;
      }
      logger.info(`Connected to blockchain: ${blockchainHealth.chain} at block ${blockchainHealth.blocks}`);
      console.log(`[SYNC INIT] Blockchain connected: ${blockchainHealth.chain} at block ${blockchainHealth.blocks}`);

      // Initialize sync state
      console.log('[SYNC INIT] Initializing sync state...');
      await this.initializeSyncState();
      
      logger.info('Sync daemon initialized successfully');
      console.log('[SYNC INIT] Initialization complete!\n');
      return true;
    } catch (error) {
      console.error('\n[SYNC INIT FATAL ERROR]', error.message);
      console.error('[SYNC INIT STACK]', error.stack);
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
      console.warn(`Current value: ${process.env.SYNC_ENABLED || '(not set)'}`);
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
          console.log('[SYNC] Paused, waiting...');
          await this.sleep(10000);
          continue;
        }

        console.log('[SYNC] Calling syncLoop...');
        await this.syncLoop();
        
        // Small delay between batches
        await this.sleep(1000);
      }
    } catch (error) {
      console.error('\n==========================================');
      console.error('[SYNC DAEMON ERROR] Caught error in main loop');
      console.error('==========================================');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('==========================================\n');
      
      logger.error('Sync daemon error:', error);
      
      // Try to save error state, but don't let this failure stop retry logic
      try {
        await this.updateSyncState({ status: 'error', lastError: error.message });
      } catch (stateError) {
        console.error('[SYNC STATE ERROR] Failed to save error state (non-fatal):', stateError.message);
        console.error('[SYNC STATE ERROR] This will not prevent retry attempts');
      }
      
      // Retry after delay
      if (this.isRunning && this.retryAttempts > 0) {
        this.retryAttempts--;
        console.log(`[SYNC RETRY] Retrying in ${this.retryDelay / 1000} seconds... (${this.retryAttempts} attempts remaining)`);
        logger.info(`Retrying in ${this.retryDelay / 1000} seconds... (${this.retryAttempts} attempts remaining)`);
        await this.sleep(this.retryDelay);
        console.log('[SYNC RETRY] Restarting sync daemon...');
        await this.start(); // Recursive restart
      } else {
        console.error('\n==========================================');
        console.error('[SYNC DAEMON FATAL] Max retry attempts reached');
        console.error('==========================================');
        console.error('The sync daemon will now stop.');
        console.error('Please check:');
        console.error('1. MongoDB is running and accessible');
        console.error('2. Raptoreumd is running and RPC is accessible');
        console.error('3. Network connectivity is working');
        console.error('4. Environment variables are correctly set');
        console.error('==========================================\n');
        
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
      console.log('[SYNC LOOP] Starting sync loop iteration...');
      
      // Get current sync state
      console.log('[SYNC LOOP] Fetching sync state from database...');
      const syncState = await SyncState.findOne({ service: 'blocks' });
      const currentBlock = syncState?.currentBlock || this.startHeight;
      console.log(`[SYNC LOOP] Current block: ${currentBlock}`);
      
      // Get blockchain info
      console.log('[SYNC LOOP] Fetching blockchain info...');
      const blockchainInfo = await blockchainService.getBlockchainInfo();
      const targetBlock = blockchainInfo.blocks;
      console.log(`[SYNC LOOP] Target block: ${targetBlock}`);
      
      // Update target
      await this.updateSyncState({ targetBlock });
      
      // Check if synced
      if (currentBlock >= targetBlock) {
        if (syncState?.status !== 'synced') {
          logger.info(`Sync complete! At block ${currentBlock}`);
          console.log(`[SYNC LOOP] Sync complete at block ${currentBlock}`);
          await this.updateSyncState({ status: 'synced' });
        } else {
          // Periodic heartbeat when synced
          console.log(`[SYNC LOOP] Already synced at block ${currentBlock}, waiting for new blocks...`);
        }
        
        // Check for new blocks every 30 seconds
        await this.sleep(30000);
        return;
      }
      
      // Calculate batch
      const endBlock = Math.min(currentBlock + this.batchSize, targetBlock);
      
      logger.info(`Syncing blocks ${currentBlock + 1} to ${endBlock} (${endBlock - currentBlock} blocks)`);
      console.log(`[SYNC LOOP] Syncing blocks ${currentBlock + 1} to ${endBlock}`);
      
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
      
      console.log(`[SYNC LOOP] Successfully synced to block ${endBlock}`);
      
      // Check and unlock mature futures
      await futureChecker.checkAndUnlockMatureFutures(endBlock, new Date());
      
    } catch (error) {
      console.error('[SYNC LOOP ERROR]', error.message);
      console.error('[SYNC LOOP STACK]', error.stack);
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
      const result = await SyncState.findOneAndUpdate(
        { service: 'blocks' },
        { $set: updates },
        { upsert: true, new: true }
      );
      console.log(`[SYNC STATE] Updated: ${JSON.stringify(updates)}`);
      return result;
    } catch (error) {
      console.error('[SYNC STATE ERROR] Failed to update sync state:', error.message);
      logger.error('Error updating sync state:', error);
      // Re-throw the error so it's not silently swallowed
      throw error;
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

// Export class for use when imported by server.js
export { SyncDaemon };
export default SyncDaemon;

// Standalone execution - only runs when this file is the entry point
const isMainModule = process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
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
      console.log('\nEnvironment Variables Check:');
      console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? '✓ Set' : '✗ Missing'}`);
      console.log(`- RAPTOREUMD_HOST: ${process.env.RAPTOREUMD_HOST || '127.0.0.1 (default)'}`);
      console.log(`- RAPTOREUMD_PORT: ${process.env.RAPTOREUMD_PORT || '10225 (default)'}`);
      console.log(`- RAPTOREUMD_USER: ${process.env.RAPTOREUMD_USER ? '✓ Set' : '✗ Missing'}`);
      console.log(`- RAPTOREUMD_PASSWORD: ${process.env.RAPTOREUMD_PASSWORD ? '✓ Set' : '✗ Missing'}`);
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
}
