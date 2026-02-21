import express from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { rateLimit } from '../middleware/rateLimit.js';
import Export from '../models/Export.js';
import pricingService from '../services/pricingService.js';
import rtmPaymentService from '../services/rtm-payment.js';
import exportSigner from '../services/exportSigner.js';
import assetTokenizer from '../services/assetTokenizer.js';

const router = express.Router();

// Export-specific rate limiting
const exportRequestLimit = parseInt(process.env.EXPORT_RATE_LIMIT_PER_HOUR || '10');
const exportRateLimit = rateLimit(exportRequestLimit, 3600); // Per hour

// Validation schemas
const requestExportSchema = z.object({
  type: z.enum(['asset', 'address', 'multi', 'legal', 'provenance']),
  assetId: z.string().optional(),
  address: z.string().optional(),
  assetIds: z.array(z.string()).optional(),
  addresses: z.array(z.string()).optional(),
  includeTransactions: z.boolean().default(true),
  includeAddresses: z.boolean().default(true),
  includeMedia: z.boolean().default(false),
  retention: z.number().min(3600).max(2592000).default(604800), // 1 hour to 30 days
  legalInfo: z.object({
    caseReference: z.string().optional(),
    court: z.string().optional(),
    purpose: z.string().optional(),
    requestingParty: z.string().optional()
  }).optional()
}).refine(data => {
  // Validate that required fields for each type are present
  if (data.type === 'asset' || data.type === 'provenance') {
    return !!data.assetId;
  }
  if (data.type === 'address') {
    return !!data.address;
  }
  if (data.type === 'multi') {
    return data.assetIds && data.assetIds.length > 0;
  }
  if (data.type === 'legal') {
    return (data.assetId || data.address) && data.legalInfo;
  }
  return true;
}, {
  message: 'Missing required fields for export type'
});

// POST /api/export/request - Initiate new export
router.post('/request', exportRateLimit, async (req, res) => {
  try {
    // Validate request body
    const validatedData = requestExportSchema.parse(req.body);
    
    // Check limits
    const maxAssets = parseInt(process.env.EXPORT_MAX_ASSETS || '1000');
    if (validatedData.assetIds && validatedData.assetIds.length > maxAssets) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${maxAssets} assets allowed per export`
      });
    }

    // Get export pricing (USD + RTM equivalent)
    const pricing = await pricingService.getExportPrice();

    // Generate a unique RTM payment address
    const paymentAddress = await rtmPaymentService.generatePaymentAddress();

    // Payment window: 30 minutes
    const paymentExpiration = new Date(Date.now() + 30 * 60 * 1000);

    // Create export record
    const exportId = Export.generateExportId();
    const exportRecord = new Export({
      exportId,
      type: validatedData.type,
      status: 'pending_payment',
      paymentAddress,
      paymentAmountUSD: pricing.usd,
      paymentAmountRTM: parseFloat(pricing.rtm.toFixed(8)),
      paymentCurrency: 'RTM',
      paymentExpiration,
      paymentConfirmed: false,
      requestData: {
        assetId: validatedData.assetId,
        assetIds: validatedData.assetIds,
        address: validatedData.address,
        addresses: validatedData.addresses,
        includeTransactions: validatedData.includeTransactions,
        includeAddresses: validatedData.includeAddresses,
        includeMedia: validatedData.includeMedia,
        retention: validatedData.retention,
        legalInfo: validatedData.legalInfo
      },
      requestIp: req.ip,
      userAgent: req.headers['user-agent']
    });

    await exportRecord.save();

    logger.info(`Export request created: ${exportId}, payment address: ${paymentAddress}, amount: ${exportRecord.paymentAmountRTM} RTM ($${pricing.usd} USD)`);

    return res.status(201).json({
      success: true,
      data: {
        exportId,
        status: 'pending_payment',
        payment: {
          address: paymentAddress,
          amount: parseFloat(pricing.rtm.toFixed(8)),
          currency: 'RTM',
          amountUsd: pricing.usd,
          expiresAt: paymentExpiration.toISOString()
        },
        createdAt: exportRecord.createdAt
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    logger.error('Error creating export request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create export request'
    });
  }
});

// GET /api/export/status/:exportId - Check export status
router.get('/status/:exportId', async (req, res) => {
  try {
    const { exportId } = req.params;
    
    const exportRecord = await Export.findOne({ exportId });
    if (!exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found'
      });
    }
    
    const response = {
      success: true,
      data: {
        exportId: exportRecord.exportId,
        type: exportRecord.type,
        status: exportRecord.status,
        progress: exportRecord.progress,
        progressMessage: exportRecord.progressMessage,
        createdAt: exportRecord.createdAt,
        payment: {
          address: exportRecord.paymentAddress,
          amount: exportRecord.paymentAmountRTM,
          currency: exportRecord.paymentCurrency || 'RTM',
          amountUsd: exportRecord.paymentAmountUSD,
          paid: exportRecord.paymentConfirmed,
          txid: exportRecord.paymentTxid,
          expiresAt: exportRecord.paymentExpiration
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    };
    
    // Add completion details if completed
    if (exportRecord.status === 'completed') {
      response.data.result = {
        assetName: exportRecord.assetName,
        blockchainTxid: exportRecord.blockchainTxid,
        fileHash: exportRecord.fileHash,
        downloadUrl: `/api/v1/export/download/${exportId}`,
        verifyUrl: `/api/v1/export/verify/${exportRecord.assetName}`,
        expiresAt: exportRecord.expiresAt
      };

      // Also add downloadUrl to top level for frontend compatibility
      response.data.downloadUrl = `/api/v1/export/download/${exportId}`;

      // Add verification data if available
      if (exportRecord.assetName && exportRecord.blockchainTxid) {
        response.data.verification = {
          assetName: exportRecord.assetName,
          txid: exportRecord.blockchainTxid,
          blockHeight: exportRecord.blockHeight || null,
          blockHash: exportRecord.blockHash || null,
          ipfsHash: exportRecord.ipfsHash || null,
          timestamp: exportRecord.createdAt.toISOString(),
          verified: !!(exportRecord.blockHeight && exportRecord.blockHash)
        };
      }
    }
    
    // Add error details if failed
    if (exportRecord.status === 'failed') {
      response.data.error = exportRecord.errorMessage;
    }
    
    // Add queue position if queued
    if (exportRecord.status === 'queued') {
      response.data.queuePosition = exportRecord.queuePosition;
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Error getting export status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export status'
    });
  }
});

// GET /api/export/download/:exportId - Download export file
router.get('/download/:exportId', exportRateLimit, async (req, res) => {
  try {
    const { exportId } = req.params;
    
    const exportRecord = await Export.findOne({ exportId });
    if (!exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found'
      });
    }
    
    // Check if completed
    if (exportRecord.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Export not completed yet',
        status: exportRecord.status
      });
    }
    
    // Check if expired
    if (exportRecord.isExpired()) {
      return res.status(410).json({
        success: false,
        error: 'Export has expired',
        message: 'Export file has been deleted after expiration. Verify the export on-chain using the blockchain token.',
        assetName: exportRecord.assetName,
        verifyUrl: exportRecord.assetName ? `/api/export/verify/${exportRecord.assetName}` : null
      });
    }
    
    // Check if file exists
    try {
      await fs.access(exportRecord.filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Export file not found',
        message: 'Export file is no longer available. The export can still be verified on-chain using the blockchain token.',
        assetName: exportRecord.assetName,
        verifyUrl: exportRecord.assetName ? `/api/export/verify/${exportRecord.assetName}` : null
      });
    }
    
    // Increment download count
    exportRecord.downloadCount += 1;
    await exportRecord.save();
    
    // Determine filename based on type and request data
    let filename = 'raptoreum_export';
    if (exportRecord.type === 'asset' && exportRecord.requestData.assetId) {
      filename += `_${exportRecord.requestData.assetId}`;
    } else if (exportRecord.type === 'address' && exportRecord.requestData.address) {
      filename += `_${exportRecord.requestData.address.substring(0, 10)}`;
    } else {
      filename += `_${exportRecord.type}`;
    }
    filename += `_${exportRecord.createdAt.toISOString().split('T')[0]}.zip`;
    
    // Send file
    res.download(exportRecord.filePath, filename);
    
    logger.info(`Export ${exportId} downloaded (count: ${exportRecord.downloadCount})`);
  } catch (error) {
    logger.error('Error downloading export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download export'
    });
  }
});

// GET /api/export/verify/:assetName - Verify export
// Note: Asset name should be URL encoded (e.g., RTM_EXPORTS%2FASSET_20260214_hash)
router.get('/verify/:assetName', exportRateLimit, async (req, res) => {
  try {
    // Decode URL-encoded asset name
    const assetName = decodeURIComponent(req.params.assetName);
    
    // Find export by asset name
    const exportRecord = await Export.findOne({ assetName });
    if (!exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found',
        message: 'No export found with this token name'
      });
    }
    
    // Verify blockchain token
    const tokenVerification = await assetTokenizer.verifyExportToken(
      assetName,
      exportRecord.ipfsHash
    );
    
    // Check IPFS availability
    const ipfsExists = await ipfsService.checkExists(exportRecord.ipfsHash);
    
    const response = {
      success: true,
      data: {
        verified: tokenVerification.verified && ipfsExists,
        exportId: exportRecord.exportId,
        type: exportRecord.type,
        createdAt: exportRecord.createdAt,
        assetName: exportRecord.assetName,
        blockchain: {
          exists: tokenVerification.exists,
          verified: tokenVerification.verified,
          txid: exportRecord.blockchainTxid,
          message: tokenVerification.message
        },
        ipfs: {
          hash: exportRecord.ipfsHash,
          exists: ipfsExists,
          urls: ipfsService.getAllGatewayUrls(exportRecord.ipfsHash)
        },
        integrity: {
          fileHash: exportRecord.fileHash,
          signature: exportRecord.signature
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error verifying export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify export'
    });
  }
});

// GET /api/export/public-key - Get public key for verification
router.get('/public-key', async (req, res) => {
  try {
    const publicKey = await exportSigner.getPublicKey();
    
    res.type('text/plain').send(publicKey);
  } catch (error) {
    logger.error('Error getting public key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get public key'
    });
  }
});

// GET /api/export/health - Export system health check
router.get('/health', async (req, res) => {
  try {
    const [ipfsHealth, tokenizerHealth] = await Promise.all([
      ipfsService.checkHealth(),
      assetTokenizer.checkHealth()
    ]);
    
    const allHealthy = 
      (ipfsHealth.status === 'connected' || ipfsHealth.status === 'disabled') &&
      (tokenizerHealth.status === 'connected' || tokenizerHealth.status === 'disabled');
    
    res.json({
      success: true,
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        paidExportsAvailable: true,
        paymentCurrency: 'RTM',
        services: {
          ipfs: ipfsHealth,
          assetTokenizer: tokenizerHealth
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  } catch (error) {
    logger.error('Error checking export system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check export system health'
    });
  }
});

export default router;
