import { logger } from '../utils/logger.js';

class LitecoinClient {
  constructor() {
    this.host = process.env.LITECOIN_RPC_HOST || '127.0.0.1';
    this.port = process.env.LITECOIN_RPC_PORT || 9332;
    this.user = process.env.LITECOIN_RPC_USER || 'litecoin';
    this.password = process.env.LITECOIN_RPC_PASSWORD || '';
    this.enabled = process.env.LITECOIN_RPC_ENABLED === 'true';
  }

  async rpcCall(method, params = []) {
    if (!this.enabled) {
      logger.warn('Litecoin RPC is disabled. Enable with LITECOIN_RPC_ENABLED=true');
      throw new Error('Litecoin RPC is disabled');
    }

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
        throw new Error(`Litecoin RPC call failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Litecoin RPC error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      logger.error(`Litecoin RPC error (${method}):`, error);
      throw error;
    }
  }

  async getBlockchainInfo() {
    return await this.rpcCall('getblockchaininfo');
  }

  async getNewAddress(label = '') {
    return await this.rpcCall('getnewaddress', [label]);
  }

  async getAddressBalance(address) {
    try {
      const unspent = await this.rpcCall('listunspent', [0, 9999999, [address]]);
      const balance = unspent.reduce((sum, utxo) => sum + utxo.amount, 0);
      return balance;
    } catch (error) {
      logger.error(`Error getting address balance for ${address}:`, error);
      return 0;
    }
  }

  async getReceivedByAddress(address, minconf = 1) {
    return await this.rpcCall('getreceivedbyaddress', [address, minconf]);
  }

  async listTransactions(address = '*', count = 10, skip = 0) {
    return await this.rpcCall('listtransactions', [address, count, skip]);
  }

  async getTransaction(txid) {
    return await this.rpcCall('gettransaction', [txid]);
  }

  async listUnspent(minconf = 1, maxconf = 9999999, addresses = []) {
    return await this.rpcCall('listunspent', [minconf, maxconf, addresses]);
  }

  async checkPayment(address, expectedAmount, minconf = 0) {
    try {
      const received = await this.getReceivedByAddress(address, minconf);
      const paid = received >= expectedAmount;
      
      if (paid) {
        // Find the transaction
        const transactions = await this.listTransactions('*', 100, 0);
        const tx = transactions.find(t => 
          t.address === address && 
          t.category === 'receive' && 
          t.amount >= expectedAmount
        );
        
        return {
          paid,
          received,
          txid: tx ? tx.txid : null,
          confirmations: tx ? tx.confirmations : 0
        };
      }
      
      return {
        paid: false,
        received,
        txid: null,
        confirmations: 0
      };
    } catch (error) {
      logger.error(`Error checking payment for ${address}:`, error);
      return {
        paid: false,
        received: 0,
        txid: null,
        confirmations: 0
      };
    }
  }

  async checkHealth() {
    if (!this.enabled) {
      return {
        status: 'disabled',
        message: 'Litecoin RPC is disabled'
      };
    }

    try {
      const info = await this.getBlockchainInfo();
      return {
        status: 'connected',
        message: 'Litecoin connection healthy',
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

export default new LitecoinClient();
