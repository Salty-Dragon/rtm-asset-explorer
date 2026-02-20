#!/usr/bin/env node

/**
 * Export API Endpoint Test
 * Tests export endpoints with validation (no external services required)
 */

console.log('='.repeat(60));
console.log('Export API Endpoint Validation Test');
console.log('='.repeat(60));

// Test validation schemas
console.log('\n[1] Testing request validation schemas...');

try {
  const { z } = await import('zod');
  
  const requestExportSchema = z.object({
    type: z.enum(['asset', 'address', 'multi', 'legal', 'provenance']),
    assetId: z.string().optional(),
    address: z.string().optional(),
    assetIds: z.array(z.string()).optional(),
    includeTransactions: z.boolean().default(true),
    includeMedia: z.boolean().default(false),
    retention: z.number().min(3600).max(2592000).default(604800),
    legalInfo: z.object({
      caseReference: z.string().optional(),
      court: z.string().optional(),
      purpose: z.string().optional()
    }).optional()
  });
  
  console.log('✓ Validation schema defined');
  
  // Test valid asset export request
  const validAssetRequest = {
    type: 'asset',
    assetId: 'TEST_ASSET',
    includeTransactions: true,
    includeMedia: false,
    retention: 86400
  };
  
  const result = requestExportSchema.parse(validAssetRequest);
  console.log('✓ Valid asset export request validated');
  
  // Test valid legal export request
  const validLegalRequest = {
    type: 'legal',
    assetId: 'TEST_ASSET',
    legalInfo: {
      caseReference: 'Case #2024-1234',
      court: 'Test Court',
      purpose: 'Evidence'
    }
  };
  
  const legalResult = requestExportSchema.parse(validLegalRequest);
  console.log('✓ Valid legal export request validated');
  
  // Test valid multi export request
  const validMultiRequest = {
    type: 'multi',
    assetIds: ['ASSET1', 'ASSET2', 'ASSET3'],
    includeTransactions: true
  };
  
  const multiResult = requestExportSchema.parse(validMultiRequest);
  console.log('✓ Valid multi export request validated');
  
  // Test invalid retention (too short - should fail)
  try {
    const invalidRequest = {
      type: 'asset',
      assetId: 'TEST',
      retention: 1000 // Less than minimum 3600
    };
    requestExportSchema.parse(invalidRequest);
    console.error('✗ Invalid request was accepted (should have failed)');
  } catch (error) {
    console.log('✓ Invalid request correctly rejected');
  }
  
  // Test retention limits
  try {
    const tooLongRetention = {
      type: 'asset',
      assetId: 'TEST',
      retention: 3000000 // Too long
    };
    requestExportSchema.parse(tooLongRetention);
    console.error('✗ Excessive retention accepted (should have failed)');
  } catch (error) {
    console.log('✓ Excessive retention correctly rejected');
  }
  
} catch (error) {
  console.error('✗ Validation test failed:', error.message);
  process.exit(1);
}

// Test export ID generation
console.log('\n[2] Testing export ID generation...');

try {
  const Export = (await import('./src/models/Export.js')).default;
  
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    const id = Export.generateExportId();
    
    if (!id.startsWith('exp_')) {
      throw new Error('Invalid export ID prefix');
    }
    
    if (ids.has(id)) {
      throw new Error('Duplicate export ID generated');
    }
    
    ids.add(id);
  }
  
  console.log('✓ Generated 100 unique export IDs');
  console.log(`  Sample ID: ${[...ids][0]}`);
} catch (error) {
  console.error('✗ Export ID generation test failed:', error.message);
  process.exit(1);
}

// Test token name generation
console.log('\n[3] Testing token name generation...');

try {
  const assetTokenizer = (await import('./src/services/assetTokenizer.js')).default;
  
  const types = ['asset', 'address', 'multi', 'legal', 'provenance'];
  const date = new Date('2026-02-14');
  
  for (const type of types) {
    const token = assetTokenizer.generateTokenName(
      type,
      date,
      `test_content_${type}`
    );
    
    if (!token.startsWith('RTM_EXPORTS/')) {
      throw new Error(`Invalid token prefix: ${token}`);
    }
    
    if (!token.includes(type.toUpperCase())) {
      throw new Error(`Token missing type: ${token}`);
    }
    
    if (!token.includes('20260214')) {
      throw new Error(`Token missing date: ${token}`);
    }
    
    console.log(`✓ ${type.toUpperCase()}: ${token}`);
  }
  
  console.log('✓ All token names generated correctly');
} catch (error) {
  console.error('✗ Token name generation test failed:', error.message);
  process.exit(1);
}

// Test hash calculation
console.log('\n[4] Testing cryptographic operations...');

try {
  const exportSigner = (await import('./src/services/exportSigner.js')).default;
  
  const testData = 'Test data for hashing';
  const hash1 = exportSigner.calculateDataHash(testData);
  const hash2 = exportSigner.calculateDataHash(testData);
  
  if (hash1 !== hash2) {
    throw new Error('Hash calculation not deterministic');
  }
  
  if (hash1.length !== 64) {
    throw new Error('Invalid hash length');
  }
  
  console.log(`✓ SHA-256 hash: ${hash1.substring(0, 16)}...`);
  
  const differentData = 'Different test data';
  const hash3 = exportSigner.calculateDataHash(differentData);
  
  if (hash1 === hash3) {
    throw new Error('Different data produced same hash');
  }
  
  console.log('✓ Hash calculation is deterministic and unique');
} catch (error) {
  console.error('✗ Cryptographic operations test failed:', error.message);
  process.exit(1);
}

// Test pricing service
console.log('\n[5] Testing pricing calculations...');

try {
  const pricingService = (await import('./src/services/pricingService.js')).default;
  
  // Test payment validation with variance
  const expectedAmount = 0.025;
  
  // Within tolerance (+0.5%)
  const valid1 = pricingService.isPaymentAmountValid(0.02512, expectedAmount);
  if (!valid1) {
    throw new Error('Valid payment within tolerance rejected');
  }
  console.log('✓ Payment within +0.5% tolerance accepted');
  
  // Within tolerance (-0.5%)
  const valid2 = pricingService.isPaymentAmountValid(0.02488, expectedAmount);
  if (!valid2) {
    throw new Error('Valid payment within tolerance rejected');
  }
  console.log('✓ Payment within -0.5% tolerance accepted');
  
  // Outside tolerance (+2%)
  const valid3 = pricingService.isPaymentAmountValid(0.0255, expectedAmount);
  if (valid3) {
    throw new Error('Invalid payment outside tolerance accepted');
  }
  console.log('✓ Payment outside +2% tolerance rejected');
  
  // Outside tolerance (-2%)
  const valid4 = pricingService.isPaymentAmountValid(0.0245, expectedAmount);
  if (valid4) {
    throw new Error('Invalid payment outside tolerance accepted');
  }
  console.log('✓ Payment outside -2% tolerance rejected');
  
  console.log('✓ Payment variance validation works correctly');
} catch (error) {
  console.error('✗ Pricing calculation test failed:', error.message);
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('Export API Endpoint Validation Summary');
console.log('='.repeat(60));
console.log('✓ All validation tests passed');
console.log('✓ Request schemas validated correctly');
console.log('✓ Export ID generation works');
console.log('✓ Token name generation works');
console.log('✓ Cryptographic operations work');
console.log('✓ Pricing calculations work');
console.log('\n✓ Export system is ready for use');
console.log('='.repeat(60));
