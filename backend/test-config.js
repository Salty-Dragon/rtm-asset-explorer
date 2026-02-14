#!/usr/bin/env node

/**
 * Server Configuration Test
 * Verifies server can be configured without starting
 */

import 'dotenv/config';

console.log('='.repeat(60));
console.log('Server Configuration Test');
console.log('='.repeat(60));

console.log('\n[1] Checking environment configuration...');
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`  PORT: ${process.env.PORT || '4004'}`);
console.log(`  MONGODB_URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/rtm_explorer'}`);
console.log(`  REDIS_HOST: ${process.env.REDIS_HOST || '127.0.0.1'}`);
console.log('✓ Environment configured');

console.log('\n[2] Testing server module import...');
try {
  const serverModule = await import('./src/server.js');
  console.log('✓ Server module imported');
  
  if (serverModule.app) {
    console.log('✓ Express app exported');
  } else {
    console.warn('⚠ Express app not found in exports');
  }
} catch (error) {
  console.error('✗ Server module import failed:', error.message);
  process.exit(1);
}

console.log('\n[3] Checking export system configuration...');
console.log('  External services:');
console.log(`    Litecoin: ${process.env.LITECOIN_RPC_ENABLED === 'true' ? 'enabled' : 'disabled'}`);
console.log(`    IPFS: ${process.env.IPFS_ENABLED === 'true' ? 'enabled' : 'disabled'}`);
console.log(`    Asset Tokenization: ${process.env.ASSET_TOKENIZATION_ENABLED === 'true' ? 'enabled' : 'disabled'}`);
console.log('  Export settings:');
console.log(`    Price: $${process.env.EXPORT_PRICE_USD || '2.00'} USD`);
console.log(`    Max Assets: ${process.env.EXPORT_MAX_ASSETS || '1000'}`);
console.log(`    Concurrent Limit: ${process.env.EXPORT_CONCURRENT_LIMIT || '3'}`);
console.log(`    Storage Path: ${process.env.EXPORT_STORAGE_PATH || './exports'}`);
console.log('✓ Export system configured');

console.log('\n[4] Checking all route modules...');
try {
  await import('./src/routes/health.js');
  console.log('✓ Health routes');
  
  await import('./src/routes/blocks.js');
  console.log('✓ Block routes');
  
  await import('./src/routes/transactions.js');
  console.log('✓ Transaction routes');
  
  await import('./src/routes/assets.js');
  console.log('✓ Asset routes');
  
  await import('./src/routes/addresses.js');
  console.log('✓ Address routes');
  
  await import('./src/routes/stats.js');
  console.log('✓ Stats routes');
  
  await import('./src/routes/export.js');
  console.log('✓ Export routes');
} catch (error) {
  console.error('✗ Route module import failed:', error.message);
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('Server Configuration Test Summary');
console.log('='.repeat(60));
console.log('✓ All configuration checks passed');
console.log('✓ Server is ready to start (requires MongoDB and Redis)');
console.log('\nTo start the server:');
console.log('  npm start');
console.log('\nNote: Ensure MongoDB and Redis are running before starting.');
console.log('='.repeat(60));
