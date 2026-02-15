import express from 'express';
import blockchainService from '../services/blockchain.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// GET /api/v1/blockchain/info - Get blockchain information
router.get('/info',
  cacheMiddleware(30),
  async (req, res, next) => {
    try {
      const info = await blockchainService.getBlockchainInfo();
      
      // Fetch additional network and mining info
      let networkInfo, miningInfo;
      try {
        networkInfo = await blockchainService.getNetworkInfo();
      } catch (error) {
        console.warn('Failed to get network info:', error.message);
        networkInfo = { connections: 0 };
      }
      
      try {
        miningInfo = await blockchainService.getMiningInfo();
      } catch (error) {
        console.warn('Failed to get mining info:', error.message);
        miningInfo = { networkhashps: 0 };
      }

      // Get last block time
      let lastBlockTime = info.mediantime || Math.floor(Date.now() / 1000);
      try {
        const lastBlock = await blockchainService.getBlock(info.bestblockhash, 1);
        if (lastBlock && lastBlock.time) {
          lastBlockTime = lastBlock.time;
        }
      } catch (error) {
        console.warn('Failed to get last block time:', error.message);
      }

      res.json({
        success: true,
        data: {
          blockHeight: info.blocks || 0,
          blockHash: info.bestblockhash || '',
          difficulty: info.difficulty || 0,
          chainWork: info.chainwork || '',
          syncProgress: (info.verificationprogress || 0) * 100,
          networkHashRate: miningInfo.networkhashps || 0,
          connections: networkInfo.connections || 0,
          lastBlockTime: lastBlockTime,
          version: networkInfo.version ? String(networkInfo.version) : '0',
          protocolVersion: networkInfo.protocolversion || 0,
          syncedAt: new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'blockchain'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
