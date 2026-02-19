import Bull from 'bull';
import { logger } from '../utils/logger.js';
import Export from '../models/Export.js';
import exportGenerator from './exportGenerator.js';
import exportSigner from './exportSigner.js';
import assetTokenizer from './assetTokenizer.js';

class QueueProcessor {
  constructor() {
    this.redisHost = process.env.REDIS_HOST || '127.0.0.1';
    this.redisPort = parseInt(process.env.REDIS_PORT || '6379');
    this.redisPassword = process.env.REDIS_PASSWORD;
    const redisDb = parseInt(process.env.REDIS_DB || '0');
    this.redisDb = isNaN(redisDb) ? 0 : redisDb;
    this.concurrentLimit = parseInt(process.env.EXPORT_CONCURRENT_LIMIT || '3');
    this.queue = null;
  }

  async initialize() {
    try {
      // Create Bull queue
      this.queue = new Bull('export-processing', {
        redis: {
          host: this.redisHost,
          port: this.redisPort,
          password: this.redisPassword || undefined, // Only add if password is set
          db: this.redisDb
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 100,     // Keep last 100 failed jobs
          attempts: 3,           // Retry up to 3 times
          backoff: {
            type: 'exponential',
            delay: 30000         // Start with 30 second delay
          }
        }
      });

      // Process jobs
      this.queue.process(this.concurrentLimit, async (job) => {
        return await this.processExport(job);
      });

      // Event handlers
      this.queue.on('completed', (job, result) => {
        logger.info(`Export job ${job.id} completed:`, result);
      });

      this.queue.on('failed', (job, err) => {
        logger.error(`Export job ${job.id} failed:`, err);
      });

      this.queue.on('stalled', (job) => {
        logger.warn(`Export job ${job.id} stalled`);
      });

      logger.info('Export queue processor initialized');
    } catch (error) {
      logger.error('Failed to initialize queue processor:', error);
      throw error;
    }
  }

  async addJob(exportRecord) {
    if (!this.queue) {
      throw new Error('Queue processor not initialized');
    }

    try {
      const job = await this.queue.add({
        exportId: exportRecord.exportId,
        type: exportRecord.type
      }, {
        jobId: exportRecord.exportId,
        priority: exportRecord.type === 'legal' ? 1 : 5 // Legal exports have higher priority
      });

      logger.info(`Export job added to queue: ${exportRecord.exportId} (Job ID: ${job.id})`);
      
      // Update queue position
      const waiting = await this.queue.getWaitingCount();
      exportRecord.queuePosition = waiting;
      await exportRecord.save();

      return job;
    } catch (error) {
      logger.error(`Error adding job to queue for ${exportRecord.exportId}:`, error);
      throw error;
    }
  }

  async processExport(job) {
    const { exportId } = job.data;
    
    logger.info(`Processing export: ${exportId}`);
    
    try {
      // Get export record
      const exportRecord = await Export.findOne({ exportId });
      if (!exportRecord) {
        throw new Error(`Export record not found: ${exportId}`);
      }

      // Update status
      exportRecord.status = 'processing';
      exportRecord.queueStartedAt = new Date();
      exportRecord.progress = 0;
      exportRecord.progressMessage = 'Starting export generation';
      await exportRecord.save();

      // Step 1: Generate files (20%)
      await job.progress(20);
      exportRecord.progress = 20;
      exportRecord.progressMessage = 'Generating export files (JSON, CSV, PDF)';
      await exportRecord.save();

      const { filePath, size } = await exportGenerator.generateExport(exportRecord);
      exportRecord.filePath = filePath;

      // Step 2: Calculate hash and sign (40%)
      await job.progress(40);
      exportRecord.progress = 40;
      exportRecord.progressMessage = 'Calculating file hash and signing';
      await exportRecord.save();

      const fileHash = await exportSigner.calculateFileHash(filePath);
      const signature = await exportSigner.signFile(filePath);
      
      exportRecord.fileHash = fileHash;
      exportRecord.signature = signature;
      await exportRecord.save();

      // Step 3: Create blockchain token (80%)
      await job.progress(80);
      exportRecord.progress = 80;
      exportRecord.progressMessage = 'Creating blockchain token';
      await exportRecord.save();

      const tokenResult = await assetTokenizer.createExportToken({
        type: exportRecord.type,
        exportId: exportRecord.exportId,
        fileHash: exportRecord.fileHash
      });

      exportRecord.assetName = tokenResult.assetName;
      exportRecord.blockchainTxid = tokenResult.txid;
      exportRecord.blockchainConfirmed = false; // Will be confirmed later
      await exportRecord.save();

      // Step 5: Complete (100%)
      await job.progress(100);
      exportRecord.status = 'completed';
      exportRecord.progress = 100;
      exportRecord.progressMessage = 'Export completed successfully';
      exportRecord.queueCompletedAt = new Date();
      
      // Set expiration date
      const retentionSeconds = exportRecord.requestData.retention || 604800; // Default 7 days
      exportRecord.expiresAt = new Date(Date.now() + retentionSeconds * 1000);
      
      await exportRecord.save();

      logger.info(`Export ${exportId} completed successfully`);

      return {
        success: true,
        exportId,
        assetName: tokenResult.assetName,
        fileSize: size
      };
    } catch (error) {
      logger.error(`Error processing export ${exportId}:`, error);
      
      // Update export record with error
      try {
        const exportRecord = await Export.findOne({ exportId });
        if (exportRecord) {
          exportRecord.status = 'failed';
          exportRecord.errorMessage = error.message;
          exportRecord.retryCount += 1;
          await exportRecord.save();
        }
      } catch (updateError) {
        logger.error(`Error updating failed export record ${exportId}:`, updateError);
      }
      
      throw error;
    }
  }

  async getQueueStats() {
    if (!this.queue) {
      return null;
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount()
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return null;
    }
  }

  async getJobStatus(exportId) {
    if (!this.queue) {
      return null;
    }

    try {
      const job = await this.queue.getJob(exportId);
      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job._progress;

      return {
        id: job.id,
        state,
        progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason
      };
    } catch (error) {
      logger.error(`Error getting job status for ${exportId}:`, error);
      return null;
    }
  }

  async shutdown() {
    if (this.queue) {
      logger.info('Shutting down export queue processor...');
      await this.queue.close();
      logger.info('Export queue processor shut down');
    }
  }
}

export default new QueueProcessor();
