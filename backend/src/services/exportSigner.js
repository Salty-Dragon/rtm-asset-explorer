import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

class ExportSigner {
  constructor() {
    this.privateKeyPath = process.env.EXPORT_PRIVATE_KEY_PATH || path.join(process.cwd(), 'keys', 'private.pem');
    this.publicKeyPath = process.env.EXPORT_PUBLIC_KEY_PATH || path.join(process.cwd(), 'keys', 'public.pem');
    this.privateKey = null;
    this.publicKey = null;
  }

  async initialize() {
    try {
      // Try to load existing keys
      this.privateKey = await fs.readFile(this.privateKeyPath, 'utf8');
      this.publicKey = await fs.readFile(this.publicKeyPath, 'utf8');
      logger.info('Export signing keys loaded successfully');
    } catch (error) {
      logger.warn('Export signing keys not found, will need to generate them');
      // Keys will be generated on first use or via explicit generation
    }
  }

  async generateKeys() {
    logger.info('Generating new RSA-4096 key pair for export signing...');
    
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }, async (err, publicKey, privateKey) => {
        if (err) {
          logger.error('Error generating keys:', err);
          reject(err);
          return;
        }

        try {
          // Ensure keys directory exists
          const keysDir = path.dirname(this.privateKeyPath);
          await fs.mkdir(keysDir, { recursive: true });
          
          // Save keys
          await fs.writeFile(this.privateKeyPath, privateKey, { mode: 0o600 });
          await fs.writeFile(this.publicKeyPath, publicKey, { mode: 0o644 });
          
          this.privateKey = privateKey;
          this.publicKey = publicKey;
          
          logger.info('Export signing keys generated and saved successfully');
          resolve({ publicKey, privateKey });
        } catch (saveError) {
          logger.error('Error saving keys:', saveError);
          reject(saveError);
        }
      });
    });
  }

  async ensureKeys() {
    if (!this.privateKey || !this.publicKey) {
      await this.initialize();
      if (!this.privateKey || !this.publicKey) {
        await this.generateKeys();
      }
    }
  }

  async signData(data) {
    await this.ensureKeys();
    
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      sign.end();
      
      const signature = sign.sign(this.privateKey, 'hex');
      logger.debug('Data signed successfully');
      return signature;
    } catch (error) {
      logger.error('Error signing data:', error);
      throw error;
    }
  }

  async signFile(filePath) {
    await this.ensureKeys();
    
    try {
      const fileData = await fs.readFile(filePath);
      return await this.signData(fileData);
    } catch (error) {
      logger.error(`Error signing file ${filePath}:`, error);
      throw error;
    }
  }

  async verifySignature(data, signature) {
    await this.ensureKeys();
    
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();
      
      const isValid = verify.verify(this.publicKey, signature, 'hex');
      logger.debug('Signature verification:', isValid ? 'valid' : 'invalid');
      return isValid;
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  async verifyFileSignature(filePath, signature) {
    try {
      const fileData = await fs.readFile(filePath);
      return await this.verifySignature(fileData, signature);
    } catch (error) {
      logger.error(`Error verifying file signature for ${filePath}:`, error);
      return false;
    }
  }

  async getPublicKey() {
    await this.ensureKeys();
    return this.publicKey;
  }

  calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = require('fs').createReadStream(filePath);
      
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  calculateDataHash(data) {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }
}

export default new ExportSigner();
