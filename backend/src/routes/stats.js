import express from 'express';
import Block from '../models/Block.js';
import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Address from '../models/Address.js';
import AssetTransfer from '../models/AssetTransfer.js';
import blockchainService from '../services/blockchain.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// GET /api/v1/stats - Get blockchain statistics
router.get('/',
  cacheMiddleware(30),
  async (req, res, next) => {
    try {
      // Get stats from blockchain
      const blockchainInfo = await blockchainService.getBlockchainInfo();

      // Get counts from database
      const [
        totalBlocks,
        totalTransactions,
        totalAssets,
        totalAddresses,
        fungibleAssets,
        nonFungibleAssets
      ] = await Promise.all([
        Block.countDocuments(),
        Transaction.countDocuments(),
        Asset.countDocuments(),
        Address.countDocuments(),
        Asset.countDocuments({ type: 'fungible' }),
        Asset.countDocuments({ type: 'non-fungible' })
      ]);

      // Get recent blocks for average block time
      const recentBlocks = await Block.find()
        .sort({ height: -1 })
        .limit(100)
        .select('timestamp');

      let averageBlockTime = 0;
      if (recentBlocks.length > 1) {
        const times = [];
        for (let i = 0; i < recentBlocks.length - 1; i++) {
          const diff = recentBlocks[i].timestamp - recentBlocks[i + 1].timestamp;
          times.push(diff);
        }
        averageBlockTime = times.reduce((a, b) => a + b, 0) / times.length / 1000;
      }

      res.json({
        success: true,
        data: {
          blockchain: {
            chain: blockchainInfo.chain,
            blocks: blockchainInfo.blocks,
            headers: blockchainInfo.headers,
            difficulty: blockchainInfo.difficulty,
            verificationProgress: blockchainInfo.verificationprogress,
            averageBlockTime: Math.round(averageBlockTime)
          },
          database: {
            totalBlocks,
            totalTransactions,
            totalAssets,
            totalAddresses,
            fungibleAssets,
            nonFungibleAssets
          },
          syncStatus: {
            isSyncing: blockchainInfo.blocks < blockchainInfo.headers,
            blocksRemaining: blockchainInfo.headers - blockchainInfo.blocks
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'mixed'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/stats/global - Get global statistics
router.get('/global',
  cacheMiddleware(30),
  async (req, res, next) => {
    try {
      const [
        totalAssets,
        totalNFTs,
        totalFungible,
        totalTransactions,
        totalAddresses,
        totalBlocks,
        assetsWithIpfs,
        topCreatorsDocs,
        recentAssetsDocs
      ] = await Promise.all([
        Asset.countDocuments(),
        Asset.countDocuments({ type: 'non-fungible' }),
        Asset.countDocuments({ type: 'fungible' }),
        // Count AssetTransfer documents as these represent actual asset transactions
        AssetTransfer.countDocuments(),
        Address.countDocuments(),
        Block.countDocuments(),
        Asset.countDocuments({ ipfsHash: { $exists: true, $ne: '' } }),
        Asset.aggregate([
          { $group: { _id: '$creator', assetCount: { $sum: 1 } } },
          { $sort: { assetCount: -1 } },
          { $limit: 10 }
        ]),
        Asset.find().sort({ createdAt: -1 }).limit(10).lean()
      ]);

      const topCreators = topCreatorsDocs.map(c => ({
        address: c._id || '',
        assetCount: c.assetCount
      }));

      res.json({
        success: true,
        data: {
          totalAssets,
          totalNFTs,
          totalFungible,
          totalTransactions,
          totalAddresses,
          totalBlocks,
          assetsWithIpfs,
          topCreators,
          recentAssets: recentAssetsDocs
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'database'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/stats/assets - Get asset statistics by period
router.get('/assets',
  cacheMiddleware(60),
  async (req, res, next) => {
    try {
      const period = req.query.period || '24h';
      const periodMap = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        'all': null
      };
      const ms = periodMap[period];
      const dateFilter = ms ? { createdAt: { $gte: new Date(Date.now() - ms) } } : {};

      const [
        newAssets,
        newNFTs,
        newFungible,
        totalTransfers,
        activeAddressesDocs,
        topAssetsDocs
      ] = await Promise.all([
        Asset.countDocuments(dateFilter),
        Asset.countDocuments({ ...dateFilter, type: 'non-fungible' }),
        Asset.countDocuments({ ...dateFilter, type: 'fungible' }),
        AssetTransfer.countDocuments(ms ? { timestamp: { $gte: new Date(Date.now() - ms) } } : {}),
        AssetTransfer.distinct('from', ms ? { timestamp: { $gte: new Date(Date.now() - ms) } } : {}),
        AssetTransfer.aggregate([
          ...(ms ? [{ $match: { timestamp: { $gte: new Date(Date.now() - ms) } } }] : []),
          { $group: { _id: '$assetName', transferCount: { $sum: 1 }, uniqueOwners: { $addToSet: '$to' } } },
          { $project: { assetName: '$_id', transferCount: 1, uniqueOwners: { $size: '$uniqueOwners' } } },
          { $sort: { transferCount: -1 } },
          { $limit: 10 }
        ])
      ]);

      res.json({
        success: true,
        data: {
          period,
          newAssets,
          newNFTs,
          newFungible,
          totalTransfers,
          activeAddresses: activeAddressesDocs.length,
          topAssets: topAssetsDocs.map(a => ({
            assetName: a.assetName || a._id,
            transferCount: a.transferCount,
            uniqueOwners: a.uniqueOwners
          }))
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'database'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/stats/creators - Get top creators
router.get('/creators',
  cacheMiddleware(60),
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);

      const creators = await Asset.aggregate([
        { $group: {
          _id: '$creator',
          totalAssets: { $sum: 1 },
          nftCount: { $sum: { $cond: [{ $eq: ['$type', 'non-fungible'] }, 1, 0] } },
          fungibleCount: { $sum: { $cond: [{ $eq: ['$type', 'fungible'] }, 1, 0] } },
          firstAssetDate: { $min: '$createdAt' },
          lastAssetDate: { $max: '$createdAt' },
          assetNames: { $push: '$name' }
        }},
        { $sort: { totalAssets: -1 } },
        { $limit: limit }
      ]);

      // Get transfer counts for each creator's assets
      const creatorData = await Promise.all(
        creators.map(async (c) => {
          const transferCount = await AssetTransfer.countDocuments({
            assetName: { $in: c.assetNames }
          });
          return {
            address: c._id || '',
            totalAssets: c.totalAssets,
            nftCount: c.nftCount,
            fungibleCount: c.fungibleCount,
            totalTransfers: transferCount,
            firstAssetDate: c.firstAssetDate,
            lastAssetDate: c.lastAssetDate
          };
        })
      );

      res.json({
        success: true,
        data: creatorData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'database'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/stats/creators/:address - Get stats for a specific creator
router.get('/creators/:address',
  cacheMiddleware(60),
  async (req, res, next) => {
    try {
      const { address } = req.params;

      const stats = await Asset.aggregate([
        { $match: { creator: address } },
        { $group: {
          _id: '$creator',
          totalAssets: { $sum: 1 },
          nftCount: { $sum: { $cond: [{ $eq: ['$type', 'non-fungible'] }, 1, 0] } },
          fungibleCount: { $sum: { $cond: [{ $eq: ['$type', 'fungible'] }, 1, 0] } },
          firstAssetDate: { $min: '$createdAt' },
          lastAssetDate: { $max: '$createdAt' },
          assetNames: { $push: '$name' }
        }}
      ]);

      if (!stats.length) {
        return res.status(404).json({
          success: false,
          error: { message: 'Creator not found' },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || 'req_' + Date.now()
          }
        });
      }

      const creator = stats[0];
      const transferCount = await AssetTransfer.countDocuments({
        assetName: { $in: creator.assetNames }
      });

      res.json({
        success: true,
        data: {
          address: creator._id || address,
          totalAssets: creator.totalAssets,
          nftCount: creator.nftCount,
          fungibleCount: creator.fungibleCount,
          totalTransfers: transferCount,
          firstAssetDate: creator.firstAssetDate,
          lastAssetDate: creator.lastAssetDate
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'database'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
