import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  });
};
