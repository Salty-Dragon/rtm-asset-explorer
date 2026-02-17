#!/usr/bin/env node

/**
 * Check Transfer Data
 * 
 * This script checks the current state of asset transfers in the database
 * and provides recommendations on whether a re-sync is needed.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import models
import Asset from './src/models/Asset.js';
import AssetTransfer from './src/models/AssetTransfer.js';
import Transaction from './src/models/Transaction.js';
import Block from './src/models/Block.js';
import SyncState from './src/models/SyncState.js';

async function checkTransferData() {
  try {
    console.log('\n================================================');
    console.log('RTM Asset Explorer - Transfer Data Check');
    console.log('================================================\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Get counts
    console.log('📊 Database Statistics:');
    console.log('─────────────────────────────────────────────────');
    
    const [
      assetCount,
      assetTransferCount,
      transactionCount,
      blockCount,
      syncState
    ] = await Promise.all([
      Asset.countDocuments(),
      AssetTransfer.countDocuments(),
      Transaction.countDocuments(),
      Block.countDocuments(),
      SyncState.findOne({ service: 'blocks' })
    ]);

    console.log(`Total Assets:         ${assetCount.toLocaleString()}`);
    console.log(`Asset Transfers:      ${assetTransferCount.toLocaleString()}`);
    console.log(`Transactions:         ${transactionCount.toLocaleString()}`);
    console.log(`Blocks Synced:        ${blockCount.toLocaleString()}`);
    
    if (syncState) {
      console.log(`\nSync State:`);
      console.log(`  Current Block:      ${syncState.currentBlock?.toLocaleString() || 'N/A'}`);
      console.log(`  Target Block:       ${syncState.targetBlock?.toLocaleString() || 'N/A'}`);
      console.log(`  Status:             ${syncState.status || 'N/A'}`);
      console.log(`  Last Synced:        ${syncState.lastSyncedAt || 'N/A'}`);
    }

    // Get sample of assets with transfer counts
    console.log('\n📈 Asset Transfer Distribution:');
    console.log('─────────────────────────────────────────────────');
    
    const assetsWithTransfers = await Asset.countDocuments({ transferCount: { $gt: 0 } });
    const assetsWithoutTransfers = await Asset.countDocuments({ transferCount: 0 });
    
    console.log(`Assets with transfers:    ${assetsWithTransfers.toLocaleString()}`);
    console.log(`Assets without transfers: ${assetsWithoutTransfers.toLocaleString()}`);

    // Get top assets by transfer count
    const topAssets = await Asset.find({ transferCount: { $gt: 0 } })
      .sort({ transferCount: -1 })
      .limit(5)
      .select('name transferCount');
    
    if (topAssets.length > 0) {
      console.log('\nTop 5 assets by transfer count:');
      topAssets.forEach((asset, i) => {
        console.log(`  ${i + 1}. ${asset.name}: ${asset.transferCount} transfers`);
      });
    }

    // Get transfer type breakdown
    const mintCount = await AssetTransfer.countDocuments({ type: 'mint' });
    const transferTypeCount = await AssetTransfer.countDocuments({ type: 'transfer' });
    
    console.log(`\n💱 Transfer Type Breakdown:`);
    console.log('─────────────────────────────────────────────────');
    console.log(`Mints:                ${mintCount.toLocaleString()}`);
    console.log(`Transfers:            ${transferTypeCount.toLocaleString()}`);

    // Analysis and recommendations
    console.log('\n🔍 Analysis:');
    console.log('─────────────────────────────────────────────────');
    
    if (assetCount > 0 && assetTransferCount === 0) {
      console.log('⚠️  WARNING: Assets exist but NO transfers recorded!');
      console.log('    This indicates transfers were not detected during sync.');
      console.log('\n💡 RECOMMENDATION: Force a re-sync to detect transfers');
      console.log('    The transfer detection logic has been improved.');
      console.log('    Re-syncing will populate missing transfer data.');
    } else if (assetCount > 0 && assetsWithoutTransfers > assetsWithTransfers) {
      console.log('⚠️  Many assets have no recorded transfers.');
      console.log('    This might be normal if assets were created but not minted/transferred.');
      console.log('\n💡 RECOMMENDATION: Review logs during next sync cycle');
      console.log('    Check if transfers are being detected going forward.');
    } else if (assetTransferCount > 0) {
      console.log('✓ Transfer data exists in database');
      console.log(`  ${assetTransferCount} transfers recorded`);
      
      if (assetTransferCount < assetCount) {
        console.log('\n💡 Some assets may not have transfers (this could be normal)');
      }
    } else if (assetCount === 0) {
      console.log('ℹ️  No assets in database yet.');
      console.log('   Either sync hasn\'t started or no assets exist on blockchain.');
    }

    console.log('\n================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkTransferData();
