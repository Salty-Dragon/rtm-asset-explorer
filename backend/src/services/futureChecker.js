import FutureOutput from '../models/FutureOutput.js';
import Transaction from '../models/Transaction.js';
import { logger } from '../utils/logger.js';

class FutureChecker {
  /**
   * Handle future transaction (Type 7 - FutureTx)
   */
  async handleFutureTransaction(tx, blockHeight, blockTime) {
    try {
      if (!tx.futureTx) {
        logger.warn(`No futureTx data in transaction ${tx.txid}`);
        return null;
      }

      const { maturity, lockTime, lockOutputIndex, updatableByDestination } = tx.futureTx;
      
      if (lockOutputIndex === undefined || !tx.vout || !tx.vout[lockOutputIndex]) {
        logger.warn(`Invalid lockOutputIndex in future transaction ${tx.txid}`);
        return null;
      }

      const lockedVout = tx.vout[lockOutputIndex];
      const recipient = lockedVout.scriptPubKey?.addresses?.[0];
      
      if (!recipient) {
        logger.warn(`No recipient address in future transaction ${tx.txid}`);
        return null;
      }

      // Determine if it's RTM or asset future
      const isAsset = lockedVout.scriptPubKey?.type === 'transferasset';
      const type = isAsset ? 'asset' : 'rtm';
      
      let assetId = null;
      let assetName = null;
      let amount = 0;

      if (isAsset && lockedVout.scriptPubKey?.asset) {
        assetName = lockedVout.scriptPubKey.asset.name;
        amount = lockedVout.scriptPubKey.asset.amount || 0;
        // AssetId would need to be looked up from asset name
      } else {
        amount = lockedVout.value || 0;
      }

      // Calculate unlock conditions
      const unlockHeight = blockHeight + (maturity || 0);
      const unlockTime = new Date(blockTime.getTime() + (lockTime || 0) * 1000);

      // Create future output record
      const futureOutput = new FutureOutput({
        txid: tx.txid,
        vout: lockOutputIndex,
        type,
        amount,
        amountSat: type === 'rtm' ? Math.round(amount * 1e8) : null,
        assetId,
        assetName,
        recipient,
        maturity: maturity || 0,
        lockTime: lockTime || 0,
        updatableByDestination: updatableByDestination || false,
        createdHeight: blockHeight,
        createdTime: blockTime,
        unlockHeight,
        unlockTime,
        isUnlocked: false,
        status: 'locked'
      });

      await futureOutput.save();
      logger.info(`Created future output: ${tx.txid}:${lockOutputIndex} type: ${type} unlock at height ${unlockHeight} or time ${unlockTime}`);

      // Record transaction with future data
      await this.recordFutureTransaction(tx, blockHeight, blockTime, {
        maturity: maturity || 0,
        lockTime: lockTime || 0,
        unlockHeight,
        unlockTime,
        lockedAmount: amount,
        assetId
      });

      return futureOutput;
    } catch (error) {
      logger.error(`Error handling future transaction ${tx.txid}:`, error);
      throw error;
    }
  }

  /**
   * Check and unlock mature futures
   * Run periodically (e.g., every 5 minutes or after each block sync)
   */
  async checkAndUnlockMatureFutures(currentHeight, currentTime) {
    try {
      const lockedFutures = await FutureOutput.find({
        status: 'locked',
        $or: [
          { unlockHeight: { $lte: currentHeight } },
          { unlockTime: { $lte: currentTime } }
        ]
      });

      let unlockedCount = 0;

      for (const future of lockedFutures) {
        const unlockedBy = currentHeight >= future.unlockHeight 
          ? 'confirmations' 
          : 'time';
        
        future.isUnlocked = true;
        future.status = 'unlocked';
        future.unlockedAt = new Date();
        future.unlockedBy = unlockedBy;
        await future.save();
        
        logger.info(`Future unlocked: ${future.txid}:${future.vout} by ${unlockedBy}`);
        unlockedCount++;
      }

      if (unlockedCount > 0) {
        logger.info(`Unlocked ${unlockedCount} mature futures at height ${currentHeight}`);
      }

      return unlockedCount;
    } catch (error) {
      logger.error('Error checking and unlocking mature futures:', error);
      throw error;
    }
  }

  /**
   * Get locked futures for an address
   */
  async getLockedFuturesForAddress(address) {
    try {
      return await FutureOutput.find({
        recipient: address,
        status: 'locked'
      }).sort({ createdHeight: -1 });
    } catch (error) {
      logger.error(`Error getting locked futures for address ${address}:`, error);
      return [];
    }
  }

  /**
   * Get locked futures for an asset
   */
  async getLockedFuturesForAsset(assetId) {
    try {
      return await FutureOutput.find({
        assetId,
        status: 'locked'
      }).sort({ createdHeight: -1 });
    } catch (error) {
      logger.error(`Error getting locked futures for asset ${assetId}:`, error);
      return [];
    }
  }

  /**
   * Record future transaction
   */
  async recordFutureTransaction(tx, blockHeight, blockTime, futureData) {
    try {
      // Check if transaction already exists
      const exists = await Transaction.findOne({ txid: tx.txid });
      if (exists) {
        logger.debug(`Transaction already recorded: ${tx.txid}`);
        return;
      }

      const transaction = new Transaction({
        txid: tx.txid,
        blockHeight,
        blockHash: tx.blockhash || '',
        timestamp: blockTime,
        confirmations: tx.confirmations || 0,
        size: tx.size || 0,
        fee: tx.fee || 0,
        inputs: (tx.vin || []).map(vin => ({
          txid: vin.txid,
          vout: vin.vout,
          address: vin.address,
          amount: vin.value || 0,
          scriptSig: vin.scriptSig?.hex
        })),
        outputs: (tx.vout || []).map(vout => ({
          n: vout.n,
          address: vout.scriptPubKey?.addresses?.[0],
          amount: vout.value || 0,
          scriptPubKey: vout.scriptPubKey?.hex
        })),
        type: 'future',
        futureData
      });

      await transaction.save();
      logger.debug(`Recorded future transaction: ${tx.txid}`);
    } catch (error) {
      // If duplicate, ignore
      if (error.code !== 11000) {
        logger.error(`Error recording future transaction ${tx.txid}:`, error);
      }
    }
  }
}

export default new FutureChecker();
