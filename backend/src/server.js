import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import crypto from 'crypto';
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
        stats: '/api/stats'
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

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
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
    await exportSigner.initialize();
    await queueProcessor.initialize();
    
    // Start payment monitoring
    paymentMonitor.start();

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Export system initialized');
    });

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

// Start server if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await startServer();
}
