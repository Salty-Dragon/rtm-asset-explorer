#!/usr/bin/env node
import 'dotenv/config';
import exportSigner from './src/services/exportSigner.js';

async function testSigning() {
  console.log('Testing export signer...\n');

  try {
    // Initialize
    console.log('[1] Initializing signer...');
    await exportSigner.initialize();
    console.log('✓ Signer initialized\n');

    // Test signing
    console.log('[2] Testing signature...');
    const testData = Buffer.from('test-export-data-' + Date.now());
    const signature = await exportSigner.signData(testData);
    console.log('✓ Signature created:', signature.substring(0, 32) + '...\n');

    // Test verification
    console.log('[3] Verifying signature...');
    const isValid = await exportSigner.verifySignature(testData, signature);
    console.log('✓ Signature valid:', isValid, '\n');

    if (!isValid) {
      throw new Error('Signature verification failed!');
    }

    console.log('✅ All tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSigning();
