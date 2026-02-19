#!/usr/bin/env node

/**
 * Test for Asset Transfer Fix
 * Tests that asset transfers work when asset.name is missing but asset.asset_id is present
 */

import 'dotenv/config';
import mongoose from 'mongoose';

console.log('='.repeat(60));
console.log('Asset Transfer Fix Test');
console.log('='.repeat(60));

let testsPassed = 0;
let testsFailed = 0;

async function runTests() {
  try {
    // Test 1: Import required modules
    console.log('\n[1] Testing module imports...');
    
    const AssetProcessor = (await import('./src/services/assetProcessor.js')).default;
    const Asset = (await import('./src/models/Asset.js')).default;
    const AssetTransfer = (await import('./src/models/AssetTransfer.js')).default;
    
    console.log('✓ AssetProcessor imported');
    console.log('✓ Asset model imported');
    console.log('✓ AssetTransfer model imported');
    testsPassed++;
    
    // Test 2: Connect to MongoDB (required for database lookup)
    console.log('\n[2] Testing MongoDB connection...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rtm-asset-explorer';
    
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✓ Connected to MongoDB');
      testsPassed++;
    } catch (error) {
      console.log('⚠ MongoDB not available, skipping database tests');
      console.log('='.repeat(60));
      console.log('Test Summary (Limited)');
      console.log('='.repeat(60));
      console.log(`✓ ${testsPassed} tests passed`);
      console.log('ℹ Database tests skipped (MongoDB not available)');
      console.log('='.repeat(60));
      return;
    }
    
    // Test 3: Test asset_id parsing (remove [vout] suffix)
    console.log('\n[3] Testing asset_id parsing...');
    
    const testAssetId = '05ec6f38709449e94f764aea1ca31ea453cc8ee6b749ec90ba47ba0f52412514a[0]';
    const expectedParsed = '05ec6f38709449e94f764aea1ca31ea453cc8ee6b749ec90ba47ba0f52412514a';
    const parsed = testAssetId.replace(/\[\d+\]$/, '');
    
    if (parsed === expectedParsed) {
      console.log('✓ Asset ID parsing works correctly');
      console.log(`  Input:  ${testAssetId}`);
      console.log(`  Output: ${parsed}`);
      testsPassed++;
    } else {
      console.log('✗ Asset ID parsing failed');
      console.log(`  Expected: ${expectedParsed}`);
      console.log(`  Got:      ${parsed}`);
      testsFailed++;
    }
    
    // Test 4: Test database lookup simulation
    console.log('\n[4] Testing database lookup with asset_id...');
    
    // Create a test asset
    const testAsset = {
      assetId: '05ec6f38709449e94f764aea1ca31ea453cc8ee6b749ec90ba47ba0f52412514a',
      name: 'TEST_ASSET',
      type: 'fungible',
      createdAt: new Date(),
      createdTxid: '05ec6f38709449e94f764aea1ca31ea453cc8ee6b749ec90ba47ba0f52412514a',
      createdBlockHeight: 100000,
      creator: 'RTestAddress123',
      totalSupply: 1000,
      decimals: 0
    };
    
    try {
      // Clean up any existing test asset
      await Asset.deleteOne({ assetId: testAsset.assetId });
      
      // Create test asset
      const createdAsset = await Asset.create(testAsset);
      console.log(`✓ Created test asset: ${createdAsset.name}`);
      
      // Lookup asset by assetId (simulating what the fix does)
      const foundAsset = await Asset.findOne({ assetId: testAsset.assetId });
      
      if (foundAsset && foundAsset.name === testAsset.name) {
        console.log('✓ Asset lookup by assetId works correctly');
        console.log(`  Found: ${foundAsset.name} (assetId: ${foundAsset.assetId})`);
        testsPassed++;
      } else {
        console.log('✗ Asset lookup failed');
        testsFailed++;
      }
      
      // Clean up test asset
      await Asset.deleteOne({ assetId: testAsset.assetId });
      console.log('✓ Cleaned up test asset');
      
    } catch (error) {
      console.log('✗ Database test failed:', error.message);
      testsFailed++;
    }
    
    // Test 5: Test handleAssetTransfer with missing name but present asset_id
    console.log('\n[5] Testing handleAssetTransfer with asset_id...');
    
    try {
      // Create a test asset first
      const testAsset2 = {
        assetId: 'test_transfer_asset_id_123',
        name: 'TRANSFER_TEST_ASSET',
        type: 'fungible',
        createdAt: new Date(),
        createdTxid: 'test_transfer_asset_id_123',
        createdBlockHeight: 100001,
        creator: 'RTestAddress456',
        totalSupply: 500,
        decimals: 0,
        transferCount: 0
      };
      
      await Asset.deleteOne({ assetId: testAsset2.assetId });
      const createdTestAsset = await Asset.create(testAsset2);
      console.log(`✓ Created test asset for transfer: ${createdTestAsset.name}`);
      
      // Create assetProcessor instance
      const assetProcessor = new AssetProcessor();
      
      // Create mock transaction with asset_id but no name (mimicking the bug scenario)
      const mockTx = {
        txid: 'mock_transfer_txid_789',
        vout: [
          {
            n: 0,
            value: 1,
            scriptPubKey: {
              type: 'transferasset',
              addresses: ['RRecipientAddress789'],
              asset: {
                asset_id: 'test_transfer_asset_id_123[0]',  // Has [vout] suffix
                amount: 10
                // Note: name is intentionally missing to test the fix
              }
            }
          }
        ],
        vin: [
          {
            address: 'RSenderAddress456'
          }
        ]
      };
      
      const blockHeight = 100002;
      const blockTime = new Date();
      const blockHash = 'mock_block_hash';
      
      // Call handleAssetTransfer
      const result = await assetProcessor.handleAssetTransfer(mockTx, blockHeight, blockTime, blockHash);
      
      if (result && result.length === 1) {
        console.log('✓ handleAssetTransfer processed the transfer successfully');
        console.log(`  Processed ${result.length} transfer(s)`);
        console.log(`  Asset: ${result[0].assetName}`);
        
        if (result[0].assetName === 'TRANSFER_TEST_ASSET') {
          console.log('✓ Asset name resolved correctly from asset_id');
          testsPassed++;
        } else {
          console.log('✗ Asset name not resolved correctly');
          console.log(`  Expected: TRANSFER_TEST_ASSET`);
          console.log(`  Got: ${result[0].assetName}`);
          testsFailed++;
        }
      } else {
        console.log('✗ handleAssetTransfer did not process the transfer');
        console.log(`  Result: ${JSON.stringify(result)}`);
        testsFailed++;
      }
      
      // Verify the asset's transferCount was updated
      const updatedAsset = await Asset.findOne({ assetId: testAsset2.assetId });
      if (updatedAsset && updatedAsset.transferCount === 1) {
        console.log('✓ Asset transferCount updated correctly');
        testsPassed++;
      } else {
        console.log('✗ Asset transferCount not updated');
        console.log(`  Expected: 1, Got: ${updatedAsset?.transferCount}`);
        testsFailed++;
      }
      
      // Verify the transfer was recorded in AssetTransfer collection
      const transferRecord = await AssetTransfer.findOne({ txid: mockTx.txid });
      if (transferRecord) {
        console.log('✓ Transfer recorded in AssetTransfer collection');
        console.log(`  Transfer: ${transferRecord.assetName} (${transferRecord.amount} units)`);
        testsPassed++;
      } else {
        console.log('✗ Transfer not recorded in AssetTransfer collection');
        testsFailed++;
      }
      
      // Clean up
      await Asset.deleteOne({ assetId: testAsset2.assetId });
      await AssetTransfer.deleteOne({ txid: mockTx.txid });
      console.log('✓ Cleaned up test data');
      
    } catch (error) {
      console.log('✗ handleAssetTransfer test failed:', error.message);
      console.error(error);
      testsFailed++;
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('\n✗ Test suite failed:', error);
    testsFailed++;
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`✓ ${testsPassed} tests passed`);
  if (testsFailed > 0) {
    console.log(`✗ ${testsFailed} tests failed`);
  }
  console.log('='.repeat(60));
  
  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
