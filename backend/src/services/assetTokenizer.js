import crypto from 'crypto';
import { logger } from '../utils/logger.js';

class AssetTokenizer {
  constructor() {
    this.remoteHost = process.env.REMOTE_RAPTOREUMD_HOST || process.env.RAPTOREUMD_HOST || '127.0.0.1';
    this.remotePort = process.env.REMOTE_RAPTOREUMD_PORT || process.env.RAPTOREUMD_PORT || 10225;
    this.remoteUser = process.env.REMOTE_RAPTOREUMD_USER || process.env.RAPTOREUMD_USER || 'rtm_explorer';
    this.remotePassword = process.env.REMOTE_RAPTOREUMD_PASSWORD || process.env.RAPTOREUMD_PASSWORD || '';
    this.enabled = process.env.ASSET_TOKENIZATION_ENABLED === 'true';
  }

  async rpcCall(method, params = []) {
    if (!this.enabled) {
      logger.warn('Asset tokenization is disabled. Enable with ASSET_TOKENIZATION_ENABLED=true');
      throw new Error('Asset tokenization is disabled');
    }

    try {
      const auth = Buffer.from(`${this.remoteUser}:${this.remotePassword}`).toString('base64');
      
      const response = await fetch(`http://${this.remoteHost}:${this.remotePort}`, {
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
        throw new Error(`Remote Raptoreumd RPC call failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Remote Raptoreumd RPC error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      logger.error(`Remote Raptoreumd RPC error (${method}):`, error);
      throw error;
    }
  }

  generateTokenName(exportType, exportDate, contentHash) {
    // Generate 8-character hash from content
    const hash = crypto.createHash('sha256')
      .update(contentHash)
      .digest('hex')
      .substring(0, 8)
      .toLowerCase();
    
    // Format date as YYYYMMDD
    const dateStr = exportDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // Construct token name: RTM_EXPORTS/TYPE_YYYYMMDD_hash8
    const tokenName = `RTM_EXPORTS/${exportType.toUpperCase()}_${dateStr}_${hash}`;
    
    logger.debug('Generated token name:', tokenName);
    return tokenName;
  }

  async createExportToken(exportData) {
    const { type, exportId, fileHash } = exportData;
    
    // Generate unique token name
    const tokenName = this.generateTokenName(
      type,
      new Date(),
      `${exportId}${fileHash}`
    );
    
    try {
      // Create sub-asset (NFT with maxMintCount: 1)
      // issueuniqueasset "asset_name" [asset_tags] "ipfs_hash" to_address [update_address] [owner_address] [initial_quantity]
      const ownerAddress = process.env.EXPORT_TOKEN_OWNER_ADDRESS || await this.getNewAddress();
      
      logger.info(`Creating export token: ${tokenName}`);
      
      const txid = await this.rpcCall('issueuniqueasset', [
        tokenName,
        [], // No tags
        '', // Empty referenceHash (RPC API requires this parameter; IPFS no longer used)
        ownerAddress,
        '', // No specific update address
        ownerAddress, // Owner address
        1 // Initial quantity (NFT)
      ]);
      
      logger.info(`Export token created: ${tokenName} (txid: ${txid})`);
      
      return {
        assetName: tokenName,
        txid,
        ownerAddress
      };
    } catch (error) {
      logger.error(`Error creating export token ${tokenName}:`, error);
      throw error;
    }
  }

  async getAssetDetails(assetName) {
    try {
      return await this.rpcCall('getassetdetailsbyname', [assetName]);
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

  async getNewAddress() {
    return await this.rpcCall('getnewaddress');
  }

  async getTransaction(txid) {
    return await this.rpcCall('getrawtransaction', [txid, true]);
  }

  async checkHealth() {
    if (!this.enabled) {
      return {
        status: 'disabled',
        message: 'Asset tokenization is disabled'
      };
    }

    try {
      const info = await this.rpcCall('getblockchaininfo');
      return {
        status: 'connected',
        message: 'Remote Raptoreumd connection healthy',
        blocks: info.blocks,
        headers: info.headers,
        chain: info.chain
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
