import Asset from '../models/Asset.js';
import AssetTransfer from '../models/AssetTransfer.js';
import Transaction from '../models/Transaction.js';
import ipfsService from './ipfs.js';
import { logger } from '../utils/logger.js';

class AssetProcessor {
  /**
   * Handle asset creation (Type 8 - NewAssetTx)
   */
  async handleAssetCreation(tx, blockHeight, blockTime) {
    try {
      if (!tx.newAssetTx) {
        logger.warn(`No newAssetTx data in transaction ${tx.txid}`);
        return null;
      }

      const { name, isUnique, maxMintCount, updatable, referenceHash, ownerAddress } = tx.newAssetTx;
      
      // Parse sub-asset info
      const isSubAsset = name.includes('|');
      let parentAssetName = null;
      let subAssetName = null;
      let parentAssetId = null;
      
      if (isSubAsset) {
        const parts = name.split('|');
        parentAssetName = parts[0].trim();
        subAssetName = parts.slice(1).join('|').trim(); // Support multiple pipes
        
        // Find parent asset
        const parentAsset = await Asset.findOne({ name: parentAssetName, isSubAsset: false });
        if (parentAsset) {
          parentAssetId = parentAsset.assetId;
        }
      }

      // Fetch IPFS metadata if referenceHash exists
      let metadata = {};
      let ipfsVerified = false;
      
      if (referenceHash) {
        try {
          const ipfsMetadata = await ipfsService.fetchMetadata(referenceHash);
          if (ipfsMetadata) {
            metadata = {
              name: ipfsMetadata.name || name,
              description: ipfsMetadata.description || '',
              image: ipfsMetadata.image || '',
              imageUrl: ipfsService.resolveImageUrl(ipfsMetadata, 'image'),
              animationUrl: ipfsMetadata.animation_url || '',
              externalUrl: ipfsMetadata.external_url || '',
              attributes: ipfsMetadata.attributes || [],
              properties: ipfsMetadata.properties || {},
              rawMetadata: ipfsMetadata
            };
            ipfsVerified = true;
          }
        } catch (error) {
          logger.error(`Error fetching IPFS metadata for asset ${name}:`, error);
        }
      }

      // Create asset record
      const asset = new Asset({
        assetId: tx.txid, // Asset ID is the creation transaction hash
        name,
        type: isUnique ? 'non-fungible' : 'fungible',
        createdAt: blockTime,
        createdTxid: tx.txid,
        createdBlockHeight: blockHeight,
        creator: ownerAddress,
        currentOwner: ownerAddress,
        isUnique,
        maxMintCount: maxMintCount || 0,
        mintCount: 0,
        updatable,
        referenceHash: referenceHash || null,
        metadata,
        ipfsHash: referenceHash,
        ipfsVerified,
        ipfsLastChecked: referenceHash ? new Date() : null,
        isSubAsset,
        parentAssetName,
        subAssetName,
        parentAssetId,
        totalSupply: 0,
        circulatingSupply: 0,
        decimals: 0
      });

      await asset.save();
      logger.info(`Created asset: ${name} (${tx.txid})`);

      // Record transaction
      await this.recordAssetTransaction(tx, blockHeight, blockTime, 'create', {
        assetId: tx.txid,
        assetName: name,
        from: null,
        to: ownerAddress,
        amount: 0
      });

      return asset;
    } catch (error) {
      logger.error(`Error handling asset creation for ${tx.txid}:`, error);
      throw error;
    }
  }

  /**
   * Handle asset mint (Type 10 - MintAssetTx)
   */
  async handleAssetMint(tx, blockHeight, blockTime) {
    try {
      if (!tx.mintAssetTx && !tx.MintAssetTx) {
        logger.warn(`No mintAssetTx data in transaction ${tx.txid}`);
        return null;
      }

      // Handle both naming conventions for compatibility
      const mintData = tx.mintAssetTx || tx.MintAssetTx;
      const { assetId } = mintData;
      
      // Find the asset vout (type: "transferasset")
      const assetVout = tx.vout?.find(vout => 
        vout.scriptPubKey?.type === 'transferasset' && 
        vout.scriptPubKey?.asset
      );

      if (!assetVout) {
        logger.warn(`No asset vout found in mint transaction ${tx.txid}`);
        return null;
      }

      const { asset } = assetVout.scriptPubKey;
      const assetName = asset.name;
      const amount = asset.amount || 0;
      const recipient = assetVout.scriptPubKey.addresses?.[0];

      if (!recipient) {
        logger.warn(`No recipient address in mint transaction ${tx.txid}`);
        return null;
      }

      // Update asset record
      const assetRecord = await Asset.findOne({ assetId });
      if (assetRecord) {
        assetRecord.mintCount += 1;
        assetRecord.circulatingSupply += amount;
        assetRecord.currentOwner = recipient;
        await assetRecord.save();
        logger.info(`Minted asset: ${assetName} amount: ${amount} to ${recipient}`);
      } else {
        logger.warn(`Asset not found for mint: ${assetId}`);
      }

      // Record transfer
      await this.recordAssetTransfer({
        txid: tx.txid,
        assetId,
        assetName,
        from: null, // Mint has no sender
        to: recipient,
        amount,
        type: 'mint',
        blockHeight,
        timestamp: blockTime
      });

      // Record transaction
      await this.recordAssetTransaction(tx, blockHeight, blockTime, 'mint', {
        assetId,
        assetName,
        from: null,
        to: recipient,
        amount
      });

      return { assetId, assetName, amount, recipient };
    } catch (error) {
      logger.error(`Error handling asset mint for ${tx.txid}:`, error);
      throw error;
    }
  }

  /**
   * Handle asset transfer (Type 0 with transferasset vout)
   */
  async handleAssetTransfer(tx, blockHeight, blockTime) {
    try {
      // Find asset vouts - check multiple possible structures
      const assetVouts = tx.vout?.filter(vout => {
        const scriptPubKey = vout.scriptPubKey;
        if (!scriptPubKey) return false;
        
        // Check for asset data in multiple locations
        return scriptPubKey.type === 'transferasset' || 
               scriptPubKey.asset ||
               (scriptPubKey.type === 'pubkeyhash' && scriptPubKey.asset);
      }) || [];

      if (assetVouts.length === 0) {
        logger.debug(`No asset vouts found in tx ${tx.txid}`);
        return null;
      }

      logger.info(`Processing ${assetVouts.length} asset transfer(s) in tx ${tx.txid}`);
      const transfers = [];

      for (const vout of assetVouts) {
        const { asset } = vout.scriptPubKey;
        
        if (!asset) {
          logger.warn(`Asset vout found but no asset data in tx ${tx.txid}, vout ${vout.n}`);
          continue;
        }
        
        const assetName = asset.name;
        const amount = asset.amount || 0;
        const recipient = vout.scriptPubKey.addresses?.[0];

        if (!recipient) {
          logger.warn(`No recipient address in tx ${tx.txid}, vout ${vout.n}`);
          continue;
        }
        
        if (!assetName) {
          logger.warn(`No asset name in tx ${tx.txid}, vout ${vout.n}`);
          continue;
        }

        // Find sender from inputs (trace back to previous transaction)
        let sender = null;
        if (tx.vin && tx.vin.length > 0) {
          // Try to get address from first input
          sender = tx.vin[0].address || null;
          
          // If not available, try other inputs
          if (!sender) {
            for (const vin of tx.vin) {
              if (vin.address) {
                sender = vin.address;
                break;
              }
            }
          }
        }

        // Find asset record
        const assetRecord = await Asset.findOne({ name: assetName });
        if (assetRecord) {
          // Update current owner
          assetRecord.currentOwner = recipient;
          assetRecord.transferCount += 1;
          assetRecord.lastTransfer = {
            txid: tx.txid,
            from: sender,
            to: recipient,
            timestamp: blockTime
          };
          await assetRecord.save();
          logger.info(`Updated asset ${assetName} transferCount to ${assetRecord.transferCount}`);
        } else {
          logger.warn(`Asset record not found for ${assetName} in transfer tx ${tx.txid}`);
        }

        // Record transfer
        await this.recordAssetTransfer({
          txid: tx.txid,
          assetId: assetRecord?.assetId || assetName,
          assetName,
          from: sender,
          to: recipient,
          amount,
          type: 'transfer',
          blockHeight,
          timestamp: blockTime
        });

        transfers.push({ assetName, amount, from: sender, to: recipient });
        logger.info(`Recorded transfer: ${assetName} from ${sender || 'unknown'} to ${recipient}, amount: ${amount}`);
      }

      // Record transaction
      if (transfers.length > 0) {
        await this.recordAssetTransaction(tx, blockHeight, blockTime, 'transfer', {
          assetId: transfers[0].assetName,
          assetName: transfers[0].assetName,
          from: transfers[0].from,
          to: transfers[0].to,
          amount: transfers[0].amount
        });
      }

      return transfers;
    } catch (error) {
      logger.error(`Error handling asset transfer for ${tx.txid}:`, error);
      throw error;
    }
  }

  /**
   * Handle asset update (Type 9 - UpdateAssetTx)
   */
  async handleAssetUpdate(tx, blockHeight, blockTime) {
    try {
      // Parse extraPayload for updated IPFS hash
      // This is simplified - actual implementation would need to decode extraPayload
      logger.info(`Asset update transaction detected: ${tx.txid}`);
      
      // Record transaction
      await this.recordAssetTransaction(tx, blockHeight, blockTime, 'update', {
        assetId: null, // Would need to parse from extraPayload
        assetName: null,
        from: null,
        to: null,
        amount: 0
      });

      return { updated: true };
    } catch (error) {
      logger.error(`Error handling asset update for ${tx.txid}:`, error);
      throw error;
    }
  }

  /**
   * Record asset transfer in AssetTransfer collection
   */
  async recordAssetTransfer(transferData) {
    try {
      // Use upsert to avoid duplicate check query
      const result = await AssetTransfer.findOneAndUpdate(
        {
          txid: transferData.txid,
          assetName: transferData.assetName,
          to: transferData.to
        },
        transferData,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          rawResult: true
        }
      );
      
      // Check if it was newly created (upserted) or already existed
      const wasNew = result.lastErrorObject && result.lastErrorObject.upserted;
      
      if (wasNew) {
        logger.info(`✓ Recorded asset transfer: ${transferData.assetName} in ${transferData.txid}, amount: ${transferData.amount}`);
      } else {
        logger.debug(`Transfer already recorded: ${transferData.assetName} in ${transferData.txid}`);
      }
      
      return result.value;
    } catch (error) {
      logger.error(`Failed to record asset transfer for ${transferData.assetName} in ${transferData.txid}:`, error);
      throw error;
    }
  }

  /**
   * Record asset transaction in Transaction collection
   */
  async recordAssetTransaction(tx, blockHeight, blockTime, operation, assetData) {
    try {
      // Check if transaction already exists
      const exists = await Transaction.findOne({ txid: tx.txid });
      if (exists) {
        logger.debug(`Transaction already recorded: ${tx.txid}`);
        return;
      }

      const txType = operation === 'create' ? 'asset_create' : 
                     operation === 'mint' ? 'asset_mint' : 
                     operation === 'transfer' ? 'asset_transfer' :
                     operation === 'update' ? 'asset_update' : 'standard';

      const transaction = new Transaction({
        txid: tx.txid,
        blockHeight,
        blockHash: tx.blockhash || '',
        timestamp: blockTime,
        confirmations: tx.confirmations || 0,
        size: tx.size || 0,
        fee: tx.fee || 0,
        inputs: (tx.vin || []).map(vin => ({
          txid: vin.txid,
          vout: vin.vout,
          address: vin.address,
          amount: vin.value || 0,
          scriptSig: vin.scriptSig?.hex
        })),
        outputs: (tx.vout || []).map(vout => ({
          n: vout.n,
          address: vout.scriptPubKey?.addresses?.[0],
          amount: vout.value || 0,
          scriptPubKey: vout.scriptPubKey?.hex
        })),
        type: txType,
        assetData: {
          assetId: assetData.assetId,
          assetName: assetData.assetName,
          amount: assetData.amount,
          from: assetData.from,
          to: assetData.to,
          operation
        }
      });

      await transaction.save();
      logger.debug(`Recorded transaction: ${tx.txid} type: ${txType}`);
    } catch (error) {
      // If duplicate, ignore
      if (error.code !== 11000) {
        logger.error(`Error recording transaction ${tx.txid}:`, error);
      }
    }
  }
}

export default new AssetProcessor();
