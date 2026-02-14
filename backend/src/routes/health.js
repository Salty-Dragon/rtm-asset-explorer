import express from 'express';
import { checkDatabaseHealth } from '../services/database.js';
import { checkCacheHealth } from '../services/cache.js';
import blockchainService from '../services/blockchain.js';
import exportSigner from '../services/exportSigner.js';

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

router.get('/signer', async (req, res) => {
  try {
    const signerInitialized = exportSigner.isInitialized();
    
    if (!signerInitialized) {
      return res.status(503).json({
        success: false,
        service: 'export-signer',
        status: 'not initialized',
        message: 'Export signing keys not configured or failed to load'
      });
    }

    // Test signature
    const testData = 'health-check-' + Date.now();
    const signature = await exportSigner.signExport(testData);
    const verified = await exportSigner.verifySignature(testData, signature);

    if (verified) {
      return res.json({
        success: true,
        service: 'export-signer',
        status: 'healthy',
        message: 'Export signing operational'
      });
    } else {
      throw new Error('Signature verification failed');
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      service: 'export-signer',
      status: 'error',
      message: error.message
    });
  }
});

export default router;
