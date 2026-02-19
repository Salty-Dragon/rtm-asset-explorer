#!/usr/bin/env node

/**
 * Simple verification test for asset_id parsing logic
 */

console.log('='.repeat(60));
console.log('Asset ID Parsing Verification');
console.log('='.repeat(60));

// Test cases for asset_id parsing
const testCases = [
  {
    input: '05ec6f38709449e94f764aea1ca31ea453cc8ee6b749ec90ba47ba0f52412514a[0]',
    expected: '05ec6f38709449e94f764aea1ca31ea453cc8ee6b749ec90ba47ba0f52412514a',
    description: 'Asset ID with [0] suffix'
  },
  {
    input: 'abc123def456[5]',
    expected: 'abc123def456',
    description: 'Asset ID with [5] suffix'
  },
  {
    input: 'xyz789[123]',
    expected: 'xyz789',
    description: 'Asset ID with [123] suffix'
  },
  {
    input: 'no_suffix_here',
    expected: 'no_suffix_here',
    description: 'Asset ID without suffix'
  },
  {
    input: 'asset[invalid',
    expected: 'asset[invalid',
    description: 'Invalid format (not parsed)'
  },
  {
    input: '05ec6f38709449e94f764aea1ca31ea453cc8e6b749ec90ba47ba0f5241251a4[1...50]',
    expected: '05ec6f38709449e94f764aea1ca31ea453cc8e6b749ec90ba47ba0f5241251a4',
    description: 'Asset ID with [1...50] range suffix'
  },
  {
    input: '05ec6f38709449e94f764aea1ca31ea453cc8e6b749ec90ba47ba0f5241251a4[51...9999]',
    expected: '05ec6f38709449e94f764aea1ca31ea453cc8e6b749ec90ba47ba0f5241251a4',
    description: 'Asset ID with [51...9999] range suffix'
  },
  {
    input: 'abc123def456[1...10000]',
    expected: 'abc123def456',
    description: 'Asset ID with [1...10000] range suffix'
  }
];

console.log('\nRunning parsing tests...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = testCase.input.replace(/\[[\d.]+\]$/, '');
  const success = result === testCase.expected;
  
  console.log(`[${index + 1}] ${testCase.description}`);
  console.log(`  Input:    "${testCase.input}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Result:   "${result}"`);
  console.log(`  Status:   ${success ? '✓ PASS' : '✗ FAIL'}`);
  console.log('');
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log('='.repeat(60));
console.log('Summary');
console.log('='.repeat(60));
console.log(`✓ Passed: ${passed}/${testCases.length}`);
if (failed > 0) {
  console.log(`✗ Failed: ${failed}/${testCases.length}`);
}
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
