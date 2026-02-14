import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';
import { connectDatabase } from './services/database.js';
import { connectCache } from './services/cache.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authenticateApiKey } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';

// Import routes
import healthRoutes from './routes/health.js';
import blockRoutes from './routes/blocks.js';
import transactionRoutes from './routes/transactions.js';
import assetRoutes from './routes/assets.js';
import addressRoutes from './routes/addresses.js';
import statsRoutes from './routes/stats.js';
import exportRoutes from './routes/export.js';
import syncRoutes from './routes/sync.js';

const app = express();
const PORT = process.env.PORT || 4004;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.id = 'req_' + crypto.randomBytes(16).toString('hex');
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      message: 'Request completed',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.id
    });
  });
  
  next();
});

// Authentication middleware (optional for most endpoints)
app.use(authenticateApiKey);

// Rate limiting based on API key tier - Applied globally to all routes
// This protects all database accesses below
app.use((req, res, next) => {
  const maxRequests = req.apiKey ? req.apiKey.rateLimit : 100;
  return rateLimit(maxRequests, 60)(req, res, next);
});

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/sync', syncRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Raptoreum Asset Explorer API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        blocks: '/api/blocks',
        transactions: '/api/transactions/:txid',
        assets: '/api/assets',
        addresses: '/api/addresses/:address',
        stats: '/api/stats',
        sync: '/api/sync/status',
        futures: '/api/sync/futures/locked'
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
let server;
let syncDaemon = null;

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  // Stop sync daemon if running
  if (syncDaemon) {
    try {
      logger.info('Stopping sync daemon...');
      await syncDaemon.stop();
      logger.info('Sync daemon stopped');
    } catch (error) {
      logger.error('Error stopping sync daemon:', error);
    }
  }
  
  if (!server) {
    process.exit(0);
  }
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      const { disconnectDatabase } = await import('./services/database.js');
      const { disconnectCache } = await import('./services/cache.js');
      const { default: queueProcessor } = await import('./services/queueProcessor.js');
      const { default: paymentMonitor } = await import('./services/paymentMonitor.js');
      
      // Stop export services
      paymentMonitor.stop();
      await queueProcessor.shutdown();
      
      await Promise.all([
        disconnectDatabase(),
        disconnectCache()
      ]);
      
      logger.info('All connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

/**
 * Start the sync daemon in-process so data synchronization works
 * without needing PM2 or a separate process.
 */
const startSyncDaemon = async () => {
  try {
    const { SyncDaemon } = await import('./services/sync-daemon.js');
    syncDaemon = new SyncDaemon();

    logger.info('==========================================');
    logger.info('Sync Daemon - Initializing');
    logger.info('==========================================');
    logger.info(`SYNC_ENABLED: ${process.env.SYNC_ENABLED || '(not set)'}`);
    logger.info(`RAPTOREUMD_HOST: ${process.env.RAPTOREUMD_HOST || '127.0.0.1 (default)'}`);
    logger.info(`RAPTOREUMD_PORT: ${process.env.RAPTOREUMD_PORT || '10225 (default)'}`);
    logger.info(`RAPTOREUMD_USER: ${process.env.RAPTOREUMD_USER ? '✓ Set' : '✗ Missing'}`);
    logger.info(`RAPTOREUMD_PASSWORD: ${process.env.RAPTOREUMD_PASSWORD ? '✓ Set' : '✗ Missing'}`);

    if (syncDaemon.syncEnabled) {
      await syncDaemon.initialize();
      // Start sync in background (don't await - it runs indefinitely)
      syncDaemon.start().catch(error => {
        logger.error('Sync daemon stopped unexpectedly:', error);
        console.error('[SYNC DAEMON] Stopped unexpectedly:', error.message);
        console.error('[SYNC DAEMON] Stack:', error.stack);
      });
      logger.info('Sync daemon started successfully in-process');
    } else {
      logger.warn('==========================================');
      logger.warn('SYNC DISABLED - No data will be synchronized');
      logger.warn('==========================================');
      logger.warn(`SYNC_ENABLED is not set to "true" (current value: ${process.env.SYNC_ENABLED || '(not set)'})`);
      logger.warn('To enable sync, set SYNC_ENABLED=true in your .env file or environment');
      logger.warn('==========================================');
    }
  } catch (error) {
    logger.error('==========================================');
    logger.error('SYNC DAEMON FAILED TO START');
    logger.error('==========================================');
    logger.error(`Error: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    logger.error('The API server will continue running but no data will be synchronized.');
    logger.error('Check your blockchain RPC configuration and try restarting.');
    logger.error('==========================================');
    // Don't exit - let the API server continue running
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await Promise.all([
      connectDatabase(),
      connectCache()
    ]);

    // Initialize export services
    const { default: exportGenerator } = await import('./services/exportGenerator.js');
    const { default: exportSigner } = await import('./services/exportSigner.js');
    const { default: queueProcessor } = await import('./services/queueProcessor.js');
    const { default: paymentMonitor } = await import('./services/paymentMonitor.js');

    await exportGenerator.initialize();
    
    // Initialize export signer (if keys are configured)
    const hasSigningKeys = (process.env.EXPORT_SIGNING_PRIVATE_KEY_PATH || process.env.EXPORT_SIGNING_PRIVATE_KEY) &&
                           (process.env.EXPORT_SIGNING_PUBLIC_KEY_PATH || process.env.EXPORT_SIGNING_PUBLIC_KEY);
    const hasLegacyKeys = (process.env.EXPORT_PRIVATE_KEY_PATH && process.env.EXPORT_PUBLIC_KEY_PATH);
    
    if (hasSigningKeys || hasLegacyKeys) {
      try {
        await exportSigner.initialize();
        logger.info('Export signer initialized');
      } catch (error) {
        logger.error('Failed to initialize export signer:', error.message);
        logger.warn('Export functionality will be disabled');
      }
    } else {
      logger.warn('Export signing keys not configured - export functionality disabled');
    }
    
    await queueProcessor.initialize();
    
    // Start payment monitoring
    paymentMonitor.start();

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Export system initialized');
    });

    // Start sync daemon in-process (no separate process needed)
    await startSyncDaemon();

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Export for testing
export { app };

// Global error handlers to prevent silent failures
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('[UNCAUGHT EXCEPTION]', error);
  // Give logger time to flush, then exit
  setTimeout(() => process.exit(1), 1000);
});

// Start server if running directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await startServer();
}
