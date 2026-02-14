import express from 'express';
import { z } from 'zod';
import Transaction from '../models/Transaction.js';
import blockchainService from '../services/blockchain.js';
import { validate, schemas } from '../middleware/validation.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// GET /api/transactions/:txid - Get transaction by ID
router.get('/:txid',
  cacheMiddleware(300),
  validate(z.object({
    txid: schemas.transactionId
  })),
  async (req, res, next) => {
    try {
      const { txid } = req.validated;

      // Try to get from database first
      let transaction = await Transaction.findOne({ txid });

      // If not in database, try blockchain
      if (!transaction) {
        try {
          const txData = await blockchainService.getRawTransaction(txid);
          
          return res.json({
            success: true,
            data: txData,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.id || 'req_' + Date.now(),
              dataSource: 'blockchain'
            }
          });
        } catch (error) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Transaction not found'
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.id || 'req_' + Date.now()
            }
          });
        }
      }

      res.json({
        success: true,
        data: transaction,
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
