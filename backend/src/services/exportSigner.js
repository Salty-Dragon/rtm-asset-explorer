import crypto from 'crypto';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

class ExportSigner {
  constructor() {
    // Support both old and new environment variable names for backward compatibility
    this.privateKeyPath = process.env.EXPORT_SIGNING_PRIVATE_KEY_PATH || process.env.EXPORT_SIGNING_PRIVATE_KEY || process.env.EXPORT_PRIVATE_KEY_PATH || path.join(process.cwd(), 'keys', 'private.pem');
    this.publicKeyPath = process.env.EXPORT_SIGNING_PUBLIC_KEY_PATH || process.env.EXPORT_SIGNING_PUBLIC_KEY || process.env.EXPORT_PUBLIC_KEY_PATH || path.join(process.cwd(), 'keys', 'public.pem');
    this.privateKey = null;
    this.publicKey = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      logger.info('Export signer already initialized');
      return;
    }

    try {
      // Load public key (always plaintext)
      this.publicKey = await fs.readFile(this.publicKeyPath, 'utf8');
      logger.info('Public key loaded successfully');

      // Load private key
      const privateKeyPem = await fs.readFile(this.privateKeyPath, 'utf8');

      // Check if key is encrypted (contains "ENCRYPTED")
      const isEncrypted = privateKeyPem.includes('ENCRYPTED');

      if (isEncrypted) {
        logger.info('Private key is encrypted, loading passphrase');
        const passphrase = await this.getPassphrase();

        if (!passphrase) {
          throw new Error('Encrypted private key requires SIGNING_KEY_PASSPHRASE environment variable');
        }

        // Store key with passphrase for signing
        this.privateKey = {
          key: privateKeyPem,
          passphrase: passphrase
        };

        // Test that passphrase works by attempting to load the key
        try {
          crypto.createPrivateKey(this.privateKey);
          logger.info('Encrypted private key loaded and verified successfully');
        } catch (error) {
          throw new Error('Invalid passphrase for encrypted private key');
        }
      } else {
        logger.warn('WARNING: Private key is not encrypted - consider using encrypted key for production');
        // Unencrypted key (backward compatibility)
        this.privateKey = privateKeyPem;
      }

      this.initialized = true;
      logger.info('Export signer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize export signer:', error.message);
      throw error;
    }
  }

  async getPassphrase() {
    // Priority 1: Environment variable
    // NOTE: This is a recommendation - do not store passphrase in .env file in production
    // Set via export/pm2/system environment instead
    if (process.env.SIGNING_KEY_PASSPHRASE) {
      logger.info('Using passphrase from SIGNING_KEY_PASSPHRASE environment variable');
      return process.env.SIGNING_KEY_PASSPHRASE;
    }

    // Priority 2: Separate passphrase file (if specified)
    const passphraseFilePath = process.env.SIGNING_KEY_PASSPHRASE_FILE;
    if (passphraseFilePath) {
      try {
        logger.info(`Loading passphrase from file: ${passphraseFilePath}`);
        const passphrase = await fs.readFile(passphraseFilePath, 'utf8');
        return passphrase.trim();
      } catch (error) {
        logger.error(`Failed to read passphrase file: ${error.message}`);
        throw new Error(`Cannot read passphrase file: ${passphraseFilePath}`);
      }
    }

    // No passphrase available
    return null;
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
          this.initialized = true;
          
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
    if (!this.initialized) {
      await this.initialize();
      if (!this.initialized) {
        await this.generateKeys();
      }
    }
  }

  async signExport(fileHash) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sign = crypto.createSign('SHA256');
      sign.update(fileHash);
      sign.end();

      // Sign with private key (handles both encrypted and unencrypted)
      const signature = sign.sign(this.privateKey, 'hex');
      
      return signature;
    } catch (error) {
      logger.error('Failed to sign export:', error.message);
      throw new Error('Export signing failed');
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
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();

      const isValid = verify.verify(this.publicKey, signature, 'hex');
      return isValid;
    } catch (error) {
      logger.error('Failed to verify signature:', error.message);
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
    if (!this.initialized) {
      await this.initialize();
    }
    return this.publicKey;
  }

  isInitialized() {
    return this.initialized;
  }

  calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);
      
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
