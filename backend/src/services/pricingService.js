import { logger } from '../utils/logger.js';

class PricingService {
  constructor() {
    this.priceVarianceTolerance = parseFloat(process.env.EXPORT_PRICE_VARIANCE || '0.01'); // ±1%
  }

  async getExportPrice() {
    const priceUSD = parseFloat(process.env.EXPORT_PRICE_USD || '2.00');

    return {
      usd: priceUSD,
      timestamp: new Date().toISOString()
    };
  }

  isPaymentAmountValid(paid, expected) {
    const minAccepted = expected * (1 - this.priceVarianceTolerance);
    const maxAccepted = expected * (1 + this.priceVarianceTolerance);

    const valid = paid >= minAccepted && paid <= maxAccepted;

    logger.debug('Payment validation:', {
      paid,
      expected,
      minAccepted,
      maxAccepted,
      variance: this.priceVarianceTolerance,
      valid
    });

    return valid;
  }
}

export default new PricingService();
