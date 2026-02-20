import { logger } from '../utils/logger.js';
import blockchainService from './blockchain.js';

class RtmPaymentService {
  async generatePaymentAddress() {
    try {
      const address = await blockchainService.rpcCall('getnewaddress', ['export_payment']);
      logger.info(`Generated RTM payment address: ${address}`);
      return address;
    } catch (error) {
      logger.error('Failed to generate RTM payment address:', error);
      throw error;
    }
  }

  async getReceivedAmount(address) {
    try {
      const amount = await blockchainService.rpcCall('getreceivedbyaddress', [address, 1]);
      return parseFloat(amount) || 0;
    } catch (error) {
      logger.error(`Failed to get received amount for address ${address}:`, error);
      throw error;
    }
  }
}

export default new RtmPaymentService();
