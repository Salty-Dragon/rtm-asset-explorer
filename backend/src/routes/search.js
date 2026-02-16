import express from 'express';
import { z } from 'zod';
import Asset from '../models/Asset.js';
import Transaction from '../models/Transaction.js';
import Address from '../models/Address.js';
import Block from '../models/Block.js';
import { validate } from '../middleware/validation.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Detect the type of search query
 */
function detectQueryType(query) {
  if (!query) return 'text';
  const trimmed = query.trim();

  // IPFS CIDv0 (starts with Qm, 46 chars)
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(trimmed)) return 'cid';
  // IPFS CIDv1 (starts with bafy, bafk, or bafz)
  if (/^baf[ykz][a-z2-7]{50,}/.test(trimmed)) return 'cid';

  // Raptoreum address (starts with R, 34 chars)
  if (/^R[a-km-zA-HJ-NP-Z1-9]{33}$/.test(trimmed)) return 'address';

  // Transaction ID or block hash (64 hex chars)
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return 'txid';

  // Block height (numeric only)
  if (/^\d+$/.test(trimmed)) return 'block_height';

  // Default to text search
  return 'text';
}

/**
 * Transform a database asset document OR blockchain RPC response to the frontend-expected format.
 * Maps field names from the DB schema to the frontend Asset type.
 * Handles both database documents and blockchain RPC responses.
 */
function transformAsset(asset) {
  const obj = asset.toObject ? asset.toObject() : { ...asset };

  if (obj.metadata?.attributes && !Array.isArray(obj.metadata.attributes)) {
    obj.metadata.attributes = Object.values(obj.metadata.attributes);
  }

  // Handle both database fields and blockchain RPC fields for amount/units
  // Database uses: totalSupply, circulatingSupply, decimals
  // Frontend uses: amount (total supply), units (circulating/available supply)
  // Blockchain RPC may use different field names
  const amount = obj.totalSupply ?? obj.amount ?? 0;
  const units = obj.circulatingSupply ?? obj.units ?? 0;

  return {
    _id: obj._id,
    assetId: obj.assetId,
    name: obj.name,
    type: obj.type === 'non-fungible' ? 'nft' : 'fungible',
    amount: amount,
    units: units,
    reissuable: obj.updatable ?? obj.reissuable ?? false,
    hasIpfs: !!obj.ipfsHash,
    ipfsHash: obj.ipfsHash || undefined,
    txid: obj.createdTxid ?? obj.txid,
    height: obj.createdBlockHeight ?? obj.height,
    blockTime: obj.createdAt ? new Date(obj.createdAt).getTime() / 1000 : obj.blockTime,
    owner: obj.creator ?? obj.owner,
    metadata: obj.metadata || undefined,
    transferCount: obj.transferCount ?? 0,
    views: obj.views ?? 0,
    isSubAsset: obj.isSubAsset ?? false,
    parentAssetName: obj.parentAssetName || undefined,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

/**
 * Transform a block document to match the frontend Block type.
 */
function transformBlock(block) {
  const obj = block.toObject ? block.toObject() : { ...block };
  return {
    _id: obj._id,
    hash: obj.hash,
    height: obj.height,
    version: obj.version,
    merkleRoot: obj.merkleRoot,
    time: obj.timestamp ? new Date(obj.timestamp).getTime() / 1000 : undefined,
    nonce: obj.nonce,
    difficulty: obj.difficulty,
    size: obj.size,
    txCount: obj.transactionCount ?? 0,
    previousBlockHash: obj.previousHash,
    createdAt: obj.createdAt,
  };
}

/**
 * Transform a transaction document to match the frontend Transaction type.
 */
function transformTransaction(tx) {
  const obj = tx.toObject ? tx.toObject() : { ...tx };
  return {
    _id: obj._id,
    txid: obj.txid,
    hash: obj.txid,
    blockHash: obj.blockHash,
    blockHeight: obj.blockHeight,
    blockTime: obj.timestamp ? new Date(obj.timestamp).getTime() / 1000 : undefined,
    confirmations: obj.confirmations,
    size: obj.size,
    fee: obj.fee,
    assetData: obj.assetData ? {
      type: obj.assetData.operation === 'create' ? 'new_asset' :
            obj.assetData.operation === 'transfer' ? 'transfer_asset' :
            'reissue_asset',
      assetName: obj.assetData.assetName,
      amount: obj.assetData.amount,
    } : undefined,
    createdAt: obj.createdAt,
  };
}

/**
 * Transform an address document to match the frontend Address type.
 */
function transformAddress(addr) {
  const obj = addr.toObject ? addr.toObject() : { ...addr };
  return {
    _id: obj._id,
    address: obj.address,
    balance: obj.balance ?? 0,
    totalReceived: obj.totalReceived ?? 0,
    totalSent: obj.totalSent ?? 0,
    txCount: obj.transactionCount ?? 0,
    assetBalances: (obj.assetBalances || []).map(ab => ({
      assetName: ab.assetId || '',
      balance: ab.balance ?? 0,
    })),
    firstSeen: obj.firstSeenAt ? new Date(obj.firstSeenAt).getTime() / 1000 : undefined,
    lastSeen: obj.lastSeenAt ? new Date(obj.lastSeenAt).getTime() / 1000 : undefined,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

// GET /api/v1/search - Universal search endpoint
router.get('/',
  cacheMiddleware(30),
  validate(z.object({
    q: z.string().min(1, 'Search query is required'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    offset: z.coerce.number().int().min(0).default(0),
  })),
  async (req, res, next) => {
    try {
      const { q, limit, offset } = req.validated;
      const queryType = detectQueryType(q);

      let assets = [];
      let transactions = [];
      let addresses = [];
      let blocks = [];

      switch (queryType) {
        case 'cid': {
          // Search assets by IPFS hash
          const found = await Asset.find({ ipfsHash: q })
            .limit(limit)
            .skip(offset);
          assets = found.map(transformAsset);
          break;
        }

        case 'address': {
          // Look up address directly
          const addr = await Address.findOne({ address: q });
          if (addr) {
            addresses = [transformAddress(addr)];
          }
          // Also find assets created by this address
          const createdAssets = await Asset.find({ creator: q })
            .sort({ createdAt: -1 })
            .limit(limit);
          assets = createdAssets.map(transformAsset);
          break;
        }

        case 'txid': {
          // Could be txid, block hash, or asset creation txid – try all
          const [tx, block, assetsByTxid] = await Promise.all([
            Transaction.findOne({ txid: q }),
            Block.findOne({ hash: q }),
            Asset.find({ createdTxid: q }).limit(limit),
          ]);
          if (tx) transactions = [transformTransaction(tx)];
          if (block) blocks = [transformBlock(block)];
          if (assetsByTxid && assetsByTxid.length > 0) {
            assets = assetsByTxid.map(transformAsset);
          }
          break;
        }

        case 'block_height': {
          const height = parseInt(q, 10);
          const block = await Block.findOne({ height });
          if (block) blocks = [transformBlock(block)];
          break;
        }

        default: {
          // Text search: search across assets by name, text index, and IPFS hash
          const searchQueries = [];

          // Escape special regex characters in query
          const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // Asset name search (case-insensitive, anchored to start for index usage)
          searchQueries.push(
            Asset.find({ name: { $regex: '^' + escapedQ, $options: 'i' } })
              .sort({ views: -1, createdAt: -1 })
              .limit(limit + offset)
          );

          // Text index search (only if query is >= 2 chars)
          if (q.length >= 2) {
            searchQueries.push(
              Asset.find(
                { $text: { $search: q } },
                { score: { $meta: 'textScore' } }
              )
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit + offset)
            );
          }

          // Also search assets by assetId (exact match)
          searchQueries.push(
            Asset.find({ assetId: q }).limit(limit)
          );

          // Search assets by partial IPFS hash (for predictive search)
          // Only search if query starts with common IPFS CID prefixes
          if (/^(Qm|baf)/i.test(q)) {
            searchQueries.push(
              Asset.find({ ipfsHash: { $regex: '^' + escapedQ, $options: 'i' } })
                .sort({ createdAt: -1 })
                .limit(limit)
            );
          } else {
            // Push empty array promise to maintain array index consistency
            searchQueries.push(Promise.resolve([]));
          }

          // Search addresses by exact match
          searchQueries.push(
            Address.find({ address: q }).limit(limit)
          );

          // Search addresses by profile username
          searchQueries.push(
            Address.find({ 'profile.username': { $regex: '^' + escapedQ, $options: 'i' } }).limit(limit)
          );

          // Search transactions by exact txid
          searchQueries.push(
            Transaction.find({ txid: q }).limit(limit)
          );

          // Search transactions by asset name
          searchQueries.push(
            Transaction.find({ 'assetData.assetName': { $regex: '^' + escapedQ, $options: 'i' } })
              .sort({ timestamp: -1 })
              .limit(limit)
          );

          // Search blocks by hash
          searchQueries.push(
            Block.find({ hash: q }).limit(limit)
          );

          const [
            nameAssets,
            textAssets,
            idAssets,
            ipfsAssets,
            exactAddresses,
            usernameAddresses,
            exactTxs,
            assetNameTxs,
            foundBlocks,
          ] = await Promise.all(searchQueries);

          // Merge and deduplicate assets, then apply offset
          const assetMap = new Map();
          for (const a of [...(nameAssets || []), ...(textAssets || []), ...(idAssets || []), ...(ipfsAssets || [])]) {
            const id = a._id.toString();
            if (!assetMap.has(id)) {
              assetMap.set(id, transformAsset(a));
            }
          }
          assets = Array.from(assetMap.values()).slice(offset, offset + limit);

          // Merge and deduplicate addresses
          const addrMap = new Map();
          for (const a of [...(exactAddresses || []), ...(usernameAddresses || [])]) {
            const id = a._id.toString();
            if (!addrMap.has(id)) {
              addrMap.set(id, transformAddress(a));
            }
          }
          addresses = Array.from(addrMap.values());

          // Merge and deduplicate transactions
          const txMap = new Map();
          for (const t of [...(exactTxs || []), ...(assetNameTxs || [])]) {
            const id = t._id.toString();
            if (!txMap.has(id)) {
              txMap.set(id, transformTransaction(t));
            }
          }
          transactions = Array.from(txMap.values());
          blocks = (foundBlocks || []).map(transformBlock);
          break;
        }
      }

      const total = assets.length + transactions.length + addresses.length + blocks.length;

      res.json({
        success: true,
        data: {
          assets,
          transactions,
          addresses,
          blocks,
          total,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'database',
        },
      });
    } catch (error) {
      logger.error('Search error:', error);
      next(error);
    }
  }
);

export default router;
