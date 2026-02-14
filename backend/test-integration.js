#!/usr/bin/env node

/**
 * Quick Integration Test for Export System
 * Tests basic functionality without external dependencies
 */

import 'dotenv/config';

console.log('='.repeat(60));
console.log('Export System Quick Test');
console.log('='.repeat(60));

// Test 1: Check imports
console.log('\n[1] Testing module imports...');

try {
  const Export = (await import('./src/models/Export.js')).default;
  console.log('✓ Export model imported');
  
  const litecoinClient = (await import('./src/services/litecoinClient.js')).default;
  console.log('✓ Litecoin client imported');
  
  const pricingService = (await import('./src/services/pricingService.js')).default;
  console.log('✓ Pricing service imported');
  
  const exportSigner = (await import('./src/services/exportSigner.js')).default;
  console.log('✓ Export signer imported');
  
  const ipfsService = (await import('./src/services/ipfsService.js')).default;
  console.log('✓ IPFS service imported');
  
  const assetTokenizer = (await import('./src/services/assetTokenizer.js')).default;
  console.log('✓ Asset tokenizer imported');
  
  const exportGenerator = (await import('./src/services/exportGenerator.js')).default;
  console.log('✓ Export generator imported');
  
  const paymentMonitor = (await import('./src/services/paymentMonitor.js')).default;
  console.log('✓ Payment monitor imported');
  
  const queueProcessor = (await import('./src/services/queueProcessor.js')).default;
  console.log('✓ Queue processor imported');
  
  const exportRoutes = (await import('./src/routes/export.js')).default;
  console.log('✓ Export routes imported');
  
  console.log('\n✓ All modules imported successfully');
} catch (error) {
  console.error('\n✗ Module import failed:', error);
  process.exit(1);
}

// Test 2: Check model functions
console.log('\n[2] Testing Export model...');

try {
  const Export = (await import('./src/models/Export.js')).default;
  
  // Test generateExportId
  const exportId = Export.generateExportId();
  console.log(`✓ Generated export ID: ${exportId}`);
  
  if (!exportId.startsWith('exp_')) {
    throw new Error('Export ID format incorrect');
  }
  console.log('✓ Export ID format valid');
} catch (error) {
  console.error('✗ Export model test failed:', error);
  process.exit(1);
}

// Test 3: Check services configuration
console.log('\n[3] Testing service configuration...');

try {
  const litecoinClient = (await import('./src/services/litecoinClient.js')).default;
  console.log('✓ Litecoin client configured');
  console.log(`  Enabled: ${process.env.LITECOIN_RPC_ENABLED || 'false'}`);
  console.log(`  Host: ${process.env.LITECOIN_RPC_HOST || '127.0.0.1'}`);
  
  const ipfsService = (await import('./src/services/ipfsService.js')).default;
  console.log('✓ IPFS service configured');
  console.log(`  Enabled: ${process.env.IPFS_ENABLED || 'false'}`);
  console.log(`  Host: ${process.env.IPFS_HOST || '127.0.0.1'}`);
  
  const assetTokenizer = (await import('./src/services/assetTokenizer.js')).default;
  console.log('✓ Asset tokenizer configured');
  console.log(`  Enabled: ${process.env.ASSET_TOKENIZATION_ENABLED || 'false'}`);
  
  const pricingService = (await import('./src/services/pricingService.js')).default;
  console.log('✓ Pricing service configured');
  
  const exportSigner = (await import('./src/services/exportSigner.js')).default;
  console.log('✓ Export signer configured');
} catch (error) {
  console.error('✗ Service configuration test failed:', error);
  process.exit(1);
}

// Test 4: Test token name generation
console.log('\n[4] Testing token name generation...');

try {
  const assetTokenizer = (await import('./src/services/assetTokenizer.js')).default;
  
  const tokenName = assetTokenizer.generateTokenName(
    'asset',
    new Date('2026-02-14'),
    'test_content_hash'
  );
  
  console.log(`✓ Generated token name: ${tokenName}`);
  
  if (!tokenName.startsWith('RTM_EXPORTS/')) {
    throw new Error('Token name prefix incorrect');
  }
  
  if (!tokenName.includes('ASSET_20260214_')) {
    throw new Error('Token name format incorrect');
  }
  
  console.log('✓ Token name format valid');
} catch (error) {
  console.error('✗ Token name generation test failed:', error);
  process.exit(1);
}

// Test 5: Test hash calculation
console.log('\n[5] Testing hash calculation...');

try {
  const exportSigner = (await import('./src/services/exportSigner.js')).default;
  
  const testData = 'test data for hashing';
  const hash = exportSigner.calculateDataHash(testData);
  
  console.log(`✓ Calculated hash: ${hash.substring(0, 16)}...`);
  
  if (hash.length !== 64) {
    throw new Error('Hash length incorrect (should be 64 for SHA-256)');
  }
  
  console.log('✓ Hash calculation works correctly');
} catch (error) {
  console.error('✗ Hash calculation test failed:', error);
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log('✓ All basic tests passed');
console.log('\nNote: External services (Litecoin, IPFS, Raptoreumd) are');
console.log('disabled by default. Enable them in .env to test full flow.');
console.log('='.repeat(60));
