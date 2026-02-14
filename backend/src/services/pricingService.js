import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

class PricingService {
  constructor() {
    // Cache prices for 60 seconds
    this.cache = new NodeCache({ stdTTL: 60 });
    this.coingeckoApiUrl = 'https://api.coingecko.com/api/v3';
    this.priceVarianceTolerance = parseFloat(process.env.EXPORT_PRICE_VARIANCE || '0.01'); // ±1%
  }

  async getLitecoinPrice() {
    const cached = this.cache.get('ltc_usd_price');
    if (cached) {
      logger.debug('Using cached Litecoin price:', cached);
      return cached;
    }

    try {
      const response = await fetch(
        `${this.coingeckoApiUrl}/simple/price?ids=litecoin&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();
      const price = data.litecoin?.usd;

      if (!price) {
        throw new Error('Invalid price data from CoinGecko');
      }

      this.cache.set('ltc_usd_price', price);
      logger.info(`Litecoin price updated: $${price}`);
      return price;
    } catch (error) {
      logger.error('Error fetching Litecoin price:', error);
      
      // Return cached value even if expired, as fallback
      const staleCache = this.cache.get('ltc_usd_price');
      if (staleCache) {
        logger.warn('Using stale cached Litecoin price:', staleCache);
        return staleCache;
      }
      
      throw error;
    }
  }

  async calculateLitecoinAmount(usdAmount) {
    const ltcPrice = await this.getLitecoinPrice();
    const ltcAmount = usdAmount / ltcPrice;
    
    logger.debug(`Calculated: $${usdAmount} = ${ltcAmount} LTC (price: $${ltcPrice})`);
    return ltcAmount;
  }

  async getExportPrice() {
    const priceUSD = parseFloat(process.env.EXPORT_PRICE_USD || '2.00');
    const priceLTC = await this.calculateLitecoinAmount(priceUSD);
    
    return {
      usd: priceUSD,
      ltc: priceLTC,
      ltcPrice: await this.getLitecoinPrice(),
      timestamp: new Date().toISOString()
    };
  }

  isPaymentAmountValid(paidLTC, expectedLTC) {
    const minAccepted = expectedLTC * (1 - this.priceVarianceTolerance);
    const maxAccepted = expectedLTC * (1 + this.priceVarianceTolerance);
    
    const valid = paidLTC >= minAccepted && paidLTC <= maxAccepted;
    
    logger.debug('Payment validation:', {
      paidLTC,
      expectedLTC,
      minAccepted,
      maxAccepted,
      variance: this.priceVarianceTolerance,
      valid
    });
    
    return valid;
  }

  async validatePayment(paidLTC, exportCreatedAt) {
    // Get the LTC price at the time of export creation (if possible)
    // For now, we'll just check with current price and variance tolerance
    const currentPrice = await this.getExportPrice();
    return this.isPaymentAmountValid(paidLTC, currentPrice.ltc);
  }
}

export default new PricingService();
