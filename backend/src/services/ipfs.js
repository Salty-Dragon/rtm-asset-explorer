import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

// IPFS Cache Schema for storing fetched metadata
const ipfsCacheSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 1
  },
  size: {
    type: Number
  },
  status: {
    type: String,
    enum: ['success', 'error', 'timeout'],
    default: 'success'
  },
  errorMessage: String
}, {
  timestamps: true
});

// Index for cleanup of old cache entries
ipfsCacheSchema.index({ lastAccessedAt: 1 });

const IPFSCache = mongoose.model('IPFSCache', ipfsCacheSchema);

class IPFSMetadataService {
  constructor() {
    this.localGateway = process.env.IPFS_LOCAL_GATEWAY || 'http://127.0.0.1:8080';
    this.publicGateway = process.env.IPFS_PUBLIC_GATEWAY || 'https://ipfs.io';
    this.timeout = parseInt(process.env.IPFS_TIMEOUT || '10000');
    this.retryAttempts = parseInt(process.env.IPFS_RETRY_ATTEMPTS || '3');
    
    this.gateways = [
      this.localGateway,
      this.publicGateway
    ];
  }

  /**
   * Get cached metadata from MongoDB
   */
  async getCachedMetadata(ipfsHash) {
    try {
      const cached = await IPFSCache.findOne({ hash: ipfsHash });
      
      if (cached) {
        // Update access tracking
        cached.lastAccessedAt = new Date();
        cached.accessCount += 1;
        await cached.save();
        
        logger.debug(`IPFS cache hit: ${ipfsHash}`);
        return cached.metadata;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error reading IPFS cache for ${ipfsHash}:`, error);
      return null;
    }
  }

  /**
   * Fetch metadata from IPFS with fallback gateways
   */
  async fetchMetadata(ipfsHash) {
    // Check cache first
    const cached = await this.getCachedMetadata(ipfsHash);
    if (cached) {
      return cached;
    }

    // Try each gateway
    for (const gateway of this.gateways) {
      try {
        logger.debug(`Fetching IPFS metadata from ${gateway}: ${ipfsHash}`);
        
        const url = `${gateway}/ipfs/${ipfsHash}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          logger.warn(`IPFS fetch failed from ${gateway}: ${response.statusText}`);
          continue;
        }
        
        const metadata = await response.json();
        
        // Cache the successful fetch
        await this.cacheMetadata(ipfsHash, metadata, 'success');
        
        logger.info(`Successfully fetched IPFS metadata from ${gateway}: ${ipfsHash}`);
        return metadata;
        
      } catch (error) {
        if (error.name === 'AbortError') {
          logger.warn(`IPFS fetch timeout from ${gateway}: ${ipfsHash}`);
        } else {
          logger.warn(`IPFS fetch error from ${gateway}:`, error.message);
        }
        // Continue to next gateway
      }
    }
    
    // All gateways failed
    const errorMsg = `Failed to fetch IPFS metadata from all gateways (${this.gateways.join(', ')})`;
    logger.error(`${errorMsg}: ${ipfsHash}`);
    await this.cacheMetadata(ipfsHash, { error: errorMsg }, 'error');
    return null;
  }

  /**
   * Cache metadata in MongoDB
   */
  async cacheMetadata(ipfsHash, metadata, status = 'success') {
    try {
      const size = JSON.stringify(metadata).length;
      
      await IPFSCache.findOneAndUpdate(
        { hash: ipfsHash },
        {
          hash: ipfsHash,
          metadata,
          status,
          size,
          fetchedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 1,
          errorMessage: status === 'error' ? metadata.error : null
        },
        { upsert: true, new: true }
      );
      
      logger.debug(`Cached IPFS metadata: ${ipfsHash}`);
    } catch (error) {
      logger.error(`Error caching IPFS metadata for ${ipfsHash}:`, error);
    }
  }

  /**
   * Resolve image URL from metadata
   */
  resolveImageUrl(metadata, imageField = 'image') {
    if (!metadata) return null;
    
    const imageValue = metadata[imageField];
    if (!imageValue) return null;
    
    // If already a full URL, return as-is
    if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
      return imageValue;
    }
    
    // If IPFS hash or ipfs:// URL
    if (imageValue.startsWith('ipfs://')) {
      const hash = imageValue.replace('ipfs://', '');
      return `${this.localGateway}/ipfs/${hash}`;
    }
    
    // Assume it's an IPFS hash
    if (imageValue.startsWith('Qm') || imageValue.startsWith('bafy')) {
      return `${this.localGateway}/ipfs/${imageValue}`;
    }
    
    return imageValue;
  }

  /**
   * Clean up old cache entries (optional maintenance)
   */
  async cleanupOldCache(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await IPFSCache.deleteMany({
        lastAccessedAt: { $lt: cutoffDate }
      });
      
      logger.info(`Cleaned up ${result.deletedCount} old IPFS cache entries`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up IPFS cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const total = await IPFSCache.countDocuments();
      const successful = await IPFSCache.countDocuments({ status: 'success' });
      const errors = await IPFSCache.countDocuments({ status: 'error' });
      
      return {
        total,
        successful,
        errors,
        hitRate: total > 0 ? (successful / total * 100).toFixed(2) + '%' : '0%'
      };
    } catch (error) {
      logger.error('Error getting IPFS cache stats:', error);
      return null;
    }
  }
}

export default new IPFSMetadataService();
