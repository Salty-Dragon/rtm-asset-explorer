import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../utils/logger.js';

class IPFSService {
  constructor() {
    this.host = process.env.IPFS_HOST || '127.0.0.1';
    this.port = process.env.IPFS_PORT || 5001;
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/';
    this.enabled = process.env.IPFS_ENABLED === 'true';
    this.fallbackGateways = [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    ];
  }

  async uploadFile(filePath, options = {}) {
    if (!this.enabled) {
      logger.warn('IPFS is disabled. Enable with IPFS_ENABLED=true');
      throw new Error('IPFS is disabled');
    }

    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      const response = await fetch(`http://${this.host}:${this.port}/api/v0/add`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      const hash = data.Hash;

      logger.info(`File uploaded to IPFS: ${hash}`);

      // Pin the file if requested
      if (options.pin !== false) {
        await this.pinHash(hash);
      }

      return {
        hash,
        size: data.Size,
        url: this.getGatewayUrl(hash)
      };
    } catch (error) {
      logger.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  async uploadData(data, options = {}) {
    if (!this.enabled) {
      logger.warn('IPFS is disabled. Enable with IPFS_ENABLED=true');
      throw new Error('IPFS is disabled');
    }

    try {
      const formData = new FormData();
      formData.append('file', Buffer.from(data), { filename: options.filename || 'data.bin' });

      const response = await fetch(`http://${this.host}:${this.port}/api/v0/add`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      const hash = result.Hash;

      logger.info(`Data uploaded to IPFS: ${hash}`);

      // Pin the data if requested
      if (options.pin !== false) {
        await this.pinHash(hash);
      }

      return {
        hash,
        size: result.Size,
        url: this.getGatewayUrl(hash)
      };
    } catch (error) {
      logger.error('Error uploading data to IPFS:', error);
      throw error;
    }
  }

  async pinHash(hash) {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await fetch(
        `http://${this.host}:${this.port}/api/v0/pin/add?arg=${hash}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`IPFS pin failed: ${response.statusText}`);
      }

      logger.info(`IPFS hash pinned: ${hash}`);
      return true;
    } catch (error) {
      logger.error(`Error pinning IPFS hash ${hash}:`, error);
      return false;
    }
  }

  async unpinHash(hash) {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await fetch(
        `http://${this.host}:${this.port}/api/v0/pin/rm?arg=${hash}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`IPFS unpin failed: ${response.statusText}`);
      }

      logger.info(`IPFS hash unpinned: ${hash}`);
      return true;
    } catch (error) {
      logger.error(`Error unpinning IPFS hash ${hash}:`, error);
      return false;
    }
  }

  async getContent(hash) {
    if (!this.enabled) {
      logger.warn('IPFS is disabled');
      throw new Error('IPFS is disabled');
    }

    try {
      const response = await fetch(`http://${this.host}:${this.port}/api/v0/cat?arg=${hash}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`IPFS cat failed: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      logger.error(`Error getting IPFS content ${hash}:`, error);
      throw error;
    }
  }

  async checkExists(hash) {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await fetch(
        `http://${this.host}:${this.port}/api/v0/block/stat?arg=${hash}`,
        { method: 'POST' }
      );

      return response.ok;
    } catch (error) {
      logger.debug(`IPFS hash ${hash} check failed:`, error);
      return false;
    }
  }

  getGatewayUrl(hash, gateway = null) {
    const baseUrl = gateway || this.gatewayUrl;
    return `${baseUrl}${hash}`;
  }

  getAllGatewayUrls(hash) {
    return this.fallbackGateways.map(gateway => this.getGatewayUrl(hash, gateway));
  }

  async checkHealth() {
    if (!this.enabled) {
      return {
        status: 'disabled',
        message: 'IPFS is disabled'
      };
    }

    try {
      const response = await fetch(`http://${this.host}:${this.port}/api/v0/version`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`IPFS health check failed: ${response.statusText}`);
      }

      const version = await response.json();
      return {
        status: 'connected',
        message: 'IPFS connection healthy',
        version: version.Version
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

export default new IPFSService();
