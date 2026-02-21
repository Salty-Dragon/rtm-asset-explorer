import crypto from 'crypto';
import { logger } from '../utils/logger.js';

class AssetTokenizer {
  constructor() {
    this.apiUrl = process.env.HOT_WALLET_API_URL || 'https://hwa.raptoreum.com/api/v1';
    this.sharedSecret = process.env.HOT_WALLET_SHARED_SECRET || '';
    this.apiTimeout = parseInt(process.env.HOT_WALLET_API_TIMEOUT || '30000', 10);
    this.enabled = process.env.ASSET_TOKENIZATION_ENABLED === 'true';

    // Local read-only RPC (for getAssetDetails / getTransaction)
    this.localHost = process.env.RAPTOREUMD_HOST || '127.0.0.1';
    this.localPort = process.env.RAPTOREUMD_PORT || 10225;
    this.localUser = process.env.RAPTOREUMD_USER || 'rtm_explorer';
    this.localPassword = process.env.RAPTOREUMD_PASSWORD || '';
  }

  generateSignature(timestamp, body) {
    const message = String(timestamp) + JSON.stringify(body);
    return crypto.createHmac('sha256', this.sharedSecret)
      .update(message)
      .digest('hex');
  }

  async hotWalletApiCall(endpoint, method = 'GET', body = null) {
    if (!this.enabled) {
      logger.warn('Asset tokenization is disabled. Enable with ASSET_TOKENIZATION_ENABLED=true');
      throw new Error('Asset tokenization is disabled');
    }

    if (!this.sharedSecret) {
      throw new Error('HOT_WALLET_SHARED_SECRET is required when asset tokenization is enabled');
    }

    const url = `${this.apiUrl}${endpoint}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.apiTimeout),
    };

    if (body !== null) {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generateSignature(timestamp, body);
      options.body = JSON.stringify({ timestamp, ...body, signature });
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Hot wallet API call failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Hot wallet API error: ${data.error || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      logger.error(`Hot wallet API error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  async localRpcCall(method, params = []) {
    try {
      const auth = Buffer.from(`${this.localUser}:${this.localPassword}`).toString('base64');

      const response = await fetch(`http://${this.localHost}:${this.localPort}`, {
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
        throw new Error(`Local Raptoreumd RPC call failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Local Raptoreumd RPC error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      logger.error(`Local Raptoreumd RPC error (${method}):`, error);
      throw error;
    }
  }

  generateTokenName(exportType, exportDate, contentHash) {
    // Generate 8-character hash from content (uppercase for hot-wallet API compatibility)
    const hash = crypto.createHash('sha256')
      .update(contentHash)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
    
    // Format date as YYYYMMDD
    const dateStr = exportDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // Construct token name with SPACES in the sub-asset name (underscores not allowed in sub-assets)
    // Full name: RTM_EXPORTS/TYPE YYYYMMDD HASH8
    const tokenName = `RTM_EXPORTS/${exportType.toUpperCase()} ${dateStr} ${hash}`;
    
    logger.debug('Generated token name:', tokenName);
    return tokenName;
  }

  async createExportToken(exportData) {
    const { type, exportId, fileHash } = exportData;
    
    // Generate unique token name and extract the sub-asset name part
    const fullTokenName = this.generateTokenName(
      type,
      new Date(),
      `${exportId}${fileHash}`
    );
    // Extract sub-asset name part (strip 'RTM_EXPORTS/' prefix)
    const tokenPrefix = 'RTM_EXPORTS/';
    if (!fullTokenName.startsWith(tokenPrefix)) {
      throw new Error(`Unexpected token name format: ${fullTokenName}`);
    }
    const assetName = fullTokenName.slice(tokenPrefix.length);

    try {
      logger.info(`Creating export token: ${assetName}`);

      const response = await this.hotWalletApiCall('/subasset/create', 'POST', {
        exportId,
        assetName,
        type,
        metadata: { description: 'Export verification token' }
      });

      const { requestId, assetName: onChainName, txid } = response.data;
      if (!onChainName || !txid) {
        throw new Error('Hot wallet API response missing required fields: assetName, txid');
      }

      logger.info(`Export token created: ${onChainName} (txid: ${txid})`);

      return {
        assetName: onChainName,
        txid,
        requestId
      };
    } catch (error) {
      logger.error(`Error creating export token ${assetName}:`, error);
      throw error;
    }
  }

  async getAssetDetails(assetName) {
    try {
      return await this.localRpcCall('getassetdetailsbyname', [assetName]);
    } catch (error) {
      logger.warn(`Asset not found: ${assetName}`);
      return null;
    }
  }

  async verifyExportToken(assetName, expectedIpfsHash) {
    try {
      const assetDetails = await this.getAssetDetails(assetName);
      
      if (!assetDetails) {
        return {
          exists: false,
          verified: false,
          message: 'Token asset not found on blockchain'
        };
      }
      
      const ipfsMatches = assetDetails.referenceHash === expectedIpfsHash;
      
      return {
        exists: true,
        verified: ipfsMatches,
        message: ipfsMatches ? 'Token verified successfully' : 'IPFS hash mismatch',
        assetDetails
      };
    } catch (error) {
      logger.error(`Error verifying export token ${assetName}:`, error);
      return {
        exists: false,
        verified: false,
        message: error.message
      };
    }
  }

  async getTransaction(txid) {
    return await this.localRpcCall('getrawtransaction', [txid, true]);
  }

  async checkHealth() {
    if (!this.enabled) {
      return {
        status: 'disabled',
        message: 'Asset tokenization is disabled'
      };
    }

    try {
      const response = await this.hotWalletApiCall('/health');
      return {
        status: 'connected',
        message: 'Hot wallet API connection healthy',
        ...response.data
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

export default new AssetTokenizer();
