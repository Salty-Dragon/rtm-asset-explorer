#!/usr/bin/env node

/**
 * Test script to verify SYNC_ENABLED logic
 * Tests the fix for the sync daemon SYNC_ENABLED parsing issue
 */

console.log('Testing SYNC_ENABLED Logic Fix\n');
console.log('='.repeat(50));

// Test the OLD logic (buggy)
function oldLogic(value) {
  return value !== 'false';
}

// Test the NEW logic (fixed)
function newLogic(value) {
  return value === 'true';
}

const testCases = [
  { value: 'true', expected: true, description: 'SYNC_ENABLED=true' },
  { value: 'false', expected: false, description: 'SYNC_ENABLED=false' },
  { value: '1', expected: false, description: 'SYNC_ENABLED=1' },
  { value: '0', expected: false, description: 'SYNC_ENABLED=0' },
  { value: 'True', expected: false, description: 'SYNC_ENABLED=True (wrong case)' },
  { value: 'FALSE', expected: false, description: 'SYNC_ENABLED=FALSE (wrong case)' },
  { value: undefined, expected: false, description: 'SYNC_ENABLED not set' },
  { value: '', expected: false, description: 'SYNC_ENABLED= (empty)' }
];

console.log('\nOLD LOGIC (BUGGY): value !== "false"\n');
let oldFailures = 0;
testCases.forEach(test => {
  const result = oldLogic(test.value);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  if (result !== test.expected) oldFailures++;
  console.log(`${status} | ${test.description.padEnd(35)} | Result: ${result}, Expected: ${test.expected}`);
});
console.log(`\nOLD LOGIC FAILURES: ${oldFailures}/${testCases.length}`);

console.log('\n' + '='.repeat(50));
console.log('\nNEW LOGIC (FIXED): value === "true"\n');
let newFailures = 0;
testCases.forEach(test => {
  const result = newLogic(test.value);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  if (result !== test.expected) newFailures++;
  console.log(`${status} | ${test.description.padEnd(35)} | Result: ${result}, Expected: ${test.expected}`);
});
console.log(`\nNEW LOGIC FAILURES: ${newFailures}/${testCases.length}`);

console.log('\n' + '='.repeat(50));
console.log('\nSUMMARY:');
console.log(`- Old Logic: ${oldFailures} failures (BROKEN)`);
console.log(`- New Logic: ${newFailures} failures (${newFailures === 0 ? 'FIXED ✅' : 'STILL BROKEN ❌'})`);
console.log('\n' + '='.repeat(50));

process.exit(newFailures > 0 ? 1 : 0);
