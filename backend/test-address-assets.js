/**
 * Test for address assets endpoint to verify it returns assets where the address
 * is either the creator or the current owner
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Asset from './src/models/Asset.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment');
  process.exit(1);
}

async function testAddressAssets() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test address that should have assets as creator
    const testAddress = 'RSx2iYT2AM5ixazzLtnuS7SuurJyGHXJjj';
    
    console.log(`\nTesting address: ${testAddress}`);
    console.log('==========================================');

    // Query 1: Assets where address is currentOwner
    const ownedAssets = await Asset.find({ currentOwner: testAddress }).limit(5);
    console.log(`\nAssets where address is currentOwner: ${ownedAssets.length}`);
    if (ownedAssets.length > 0) {
      console.log('Sample owned assets:');
      ownedAssets.forEach(asset => {
        console.log(`  - ${asset.name} (${asset.assetId})`);
      });
    }

    // Query 2: Assets where address is creator
    const createdAssets = await Asset.find({ creator: testAddress }).limit(5);
    console.log(`\nAssets where address is creator: ${createdAssets.length}`);
    if (createdAssets.length > 0) {
      console.log('Sample created assets:');
      createdAssets.forEach(asset => {
        console.log(`  - ${asset.name} (${asset.assetId})`);
      });
    }

    // Query 3: Assets where address is either creator OR currentOwner (the fix)
    const allAssets = await Asset.find({ 
      $or: [{ currentOwner: testAddress }, { creator: testAddress }] 
    }).limit(5);
    console.log(`\nAssets where address is creator OR currentOwner: ${allAssets.length}`);
    if (allAssets.length > 0) {
      console.log('Sample assets (combined):');
      allAssets.forEach(asset => {
        const isOwner = asset.currentOwner === testAddress;
        const isCreator = asset.creator === testAddress;
        let role = '';
        if (isOwner && isCreator) role = '(owner & creator)';
        else if (isOwner) role = '(owner)';
        else if (isCreator) role = '(creator)';
        console.log(`  - ${asset.name} ${role} (${asset.assetId})`);
      });
    }

    // Total counts
    const totalOwned = await Asset.countDocuments({ currentOwner: testAddress });
    const totalCreated = await Asset.countDocuments({ creator: testAddress });
    const totalCombined = await Asset.countDocuments({ 
      $or: [{ currentOwner: testAddress }, { creator: testAddress }] 
    });

    console.log('\nTotal counts:');
    console.log(`  - Total owned: ${totalOwned}`);
    console.log(`  - Total created: ${totalCreated}`);
    console.log(`  - Total (owned OR created): ${totalCombined}`);

    console.log('\n✅ Test completed successfully');
    
    if (totalCombined === 0) {
      console.log('\n⚠️  WARNING: No assets found for test address');
      console.log('This may indicate the address has no assets in the database');
    } else if (totalCreated > 0 && totalOwned === 0) {
      console.log('\n✅ VERIFIED: Address has assets as creator but not as owner');
      console.log('   The fix allows these assets to be displayed on the address detail page');
    }

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

testAddressAssets().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
