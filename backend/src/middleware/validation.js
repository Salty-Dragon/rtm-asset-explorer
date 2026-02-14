import { z } from 'zod';

// Validation patterns based on requirements
export const patterns = {
  raptoreumAddress: /^R[A-Za-z0-9]{33}$/,
  transactionId: /^[a-f0-9]{64}$/i,
  blockHash: /^[a-f0-9]{64}$/i,
  assetId: /^[A-Z0-9_]{3,30}$/
};

// Zod schemas
export const schemas = {
  raptoreumAddress: z.string().regex(patterns.raptoreumAddress, 'Invalid Raptoreum address'),
  transactionId: z.string().regex(patterns.transactionId, 'Invalid transaction ID'),
  blockHash: z.string().regex(patterns.blockHash, 'Invalid block hash'),
  assetId: z.string().regex(patterns.assetId, 'Invalid asset ID'),
  blockHeight: z.coerce.number().int().min(0, 'Block height must be non-negative'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
};

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse({
        ...req.params,
        ...req.query,
        ...req.body
      });
      
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || 'unknown'
          }
        });
      }
      next(error);
    }
  };
};
