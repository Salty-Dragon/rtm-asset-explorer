import { logger } from '../utils/logger.js';
import Export from '../models/Export.js';

class PaymentMonitor {
  constructor() {
    this.checkInterval = parseInt(process.env.PAYMENT_CHECK_INTERVAL_MS || '60000'); // 1 minute
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Payment monitor is already running');
      return;
    }

    logger.info('Starting payment monitor...');
    this.isRunning = true;
    
    // Run immediately, then on interval
    this.checkPendingPayments();
    this.intervalId = setInterval(() => {
      this.checkPendingPayments();
    }, this.checkInterval);
    
    logger.info(`Payment monitor started (checking every ${this.checkInterval}ms)`);
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Payment monitor is not running');
      return;
    }

    logger.info('Stopping payment monitor...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    logger.info('Payment monitor stopped');
  }

  async checkPendingPayments() {
    try {
      // Find exports pending payment that haven't expired
      const pendingExports = await Export.find({
        status: 'pending_payment',
        paymentConfirmed: false,
        paymentExpiration: { $gt: new Date() }
      });

      if (pendingExports.length === 0) {
        logger.debug('No pending payments to check');
        return;
      }

      logger.info(`Checking ${pendingExports.length} pending payment(s)`);

      for (const exportRecord of pendingExports) {
        await this.checkExportPayment(exportRecord);
      }

      // Also check for expired payments
      await this.expireOldPayments();
    } catch (error) {
      logger.error('Error checking pending payments:', error);
    }
  }

  async checkExportPayment(exportRecord) {
    const { exportId } = exportRecord;

    try {
      logger.debug(`Payment check for export ${exportId}: no payment processor configured`);
      // Payment processing will be handled once RTM payment support is added
    } catch (error) {
      logger.error(`Error checking payment for export ${exportId}:`, error);
    }
  }

  async queueExportProcessing(exportRecord) {
    try {
      // Import queue processor dynamically to avoid circular dependencies
      const { default: queueProcessor } = await import('./queueProcessor.js');
      await queueProcessor.addJob(exportRecord);
    } catch (error) {
      logger.error(`Error queuing export ${exportRecord.exportId}:`, error);
      
      // Update status to failed
      exportRecord.status = 'failed';
      exportRecord.errorMessage = `Failed to queue: ${error.message}`;
      await exportRecord.save();
    }
  }

  async expireOldPayments() {
    try {
      const result = await Export.updateMany(
        {
          status: 'pending_payment',
          paymentConfirmed: false,
          paymentExpiration: { $lt: new Date() }
        },
        {
          $set: {
            status: 'expired',
            errorMessage: 'Payment window expired'
          }
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Expired ${result.modifiedCount} old payment(s)`);
      }
    } catch (error) {
      logger.error('Error expiring old payments:', error);
    }
  }
}

export default new PaymentMonitor();
