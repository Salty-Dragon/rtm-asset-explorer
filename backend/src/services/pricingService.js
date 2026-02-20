import { logger } from '../utils/logger.js';

class PricingService {
  constructor() {
    this.priceVarianceTolerance = parseFloat(process.env.EXPORT_PRICE_VARIANCE || '0.01'); // ±1%
  }

  async getRtmPrice() {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=raptoreum&vs_currencies=usd');
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }
      const data = await response.json();
      const rtmPriceUSD = data.raptoreum?.usd;
      if (!rtmPriceUSD || rtmPriceUSD <= 0) {
        throw new Error('Invalid RTM price received from CoinGecko');
      }
      logger.debug(`RTM price from CoinGecko: $${rtmPriceUSD} USD`);
      return rtmPriceUSD;
    } catch (error) {
      logger.error('Failed to fetch RTM price from CoinGecko:', error);
      throw error;
    }
  }

  async calculateRtmAmount(usdAmount) {
    if (!usdAmount || usdAmount <= 0) {
      throw new Error('usdAmount must be a positive number');
    }
    const rtmPriceUSD = await this.getRtmPrice();
    return usdAmount / rtmPriceUSD;
  }

  async getExportPrice() {
    const priceUSD = parseFloat(process.env.EXPORT_PRICE_USD || '2.00');
    const rtmAmount = await this.calculateRtmAmount(priceUSD);

    return {
      usd: priceUSD,
      rtm: rtmAmount,
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
