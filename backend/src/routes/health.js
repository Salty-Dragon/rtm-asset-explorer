import express from 'express';
import { checkDatabaseHealth } from '../services/database.js';
import { checkCacheHealth } from '../services/cache.js';
import blockchainService from '../services/blockchain.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [database, cache, blockchain] = await Promise.all([
      checkDatabaseHealth(),
      checkCacheHealth(),
      blockchainService.checkHealth()
    ]);

    const allHealthy = 
      database.status === 'connected' && 
      cache.status === 'connected' && 
      blockchain.status === 'connected';

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        services: {
          database,
          cache,
          blockchain
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id || 'req_' + Date.now(),
        dataSource: 'system'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Health check failed',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id || 'req_' + Date.now()
      }
    });
  }
});

export default router;
