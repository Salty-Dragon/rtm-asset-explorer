import { logger } from '../utils/logger.js';

class BlockchainService {
  constructor() {
    this.host = process.env.RAPTOREUMD_HOST || '127.0.0.1';
    this.port = process.env.RAPTOREUMD_PORT || 10225;
    this.user = process.env.RAPTOREUMD_USER || 'rtm_explorer';
    this.password = process.env.RAPTOREUMD_PASSWORD || '';
  }

  async rpcCall(method, params = []) {
    try {
      const auth = Buffer.from(`${this.user}:${this.password}`).toString('base64');
      
      const response = await fetch(`http://${this.host}:${this.port}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({
          jsonrpc: '1.0',
          id: Date.now(),
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`RPC call failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      logger.error(`Blockchain RPC error (${method}):`, error);
      throw error;
    }
  }

  async getBlockchainInfo() {
    return await this.rpcCall('getblockchaininfo');
  }

  async getBlock(hashOrHeight, verbosity = 2) {
    return await this.rpcCall('getblock', [hashOrHeight, verbosity]);
  }

  async getBlockHash(height) {
    return await this.rpcCall('getblockhash', [height]);
  }

  async getRawTransaction(txid, verbose = true) {
    return await this.rpcCall('getrawtransaction', [txid, verbose]);
  }

  async getAssetDetailsByName(assetName) {
    try {
      return await this.rpcCall('getassetdetailsbyname', [assetName]);
    } catch (error) {
      logger.warn(`Asset not found: ${assetName}`);
      return null;
    }
  }

  async getAssetDetailsById(txid) {
    try {
      return await this.rpcCall('getassetdetailsbyid', [txid]);
    } catch (error) {
      logger.warn(`Asset not found for txid: ${txid}`);
      return null;
    }
  }

  async listAssets() {
    return await this.rpcCall('listassets');
  }

  async checkHealth() {
    try {
      const info = await this.getBlockchainInfo();
      return {
        status: 'connected',
        message: 'Blockchain connection healthy',
        blocks: info.blocks,
        headers: info.headers,
        chain: info.chain,
        verificationProgress: info.verificationprogress
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

export default new BlockchainService();
