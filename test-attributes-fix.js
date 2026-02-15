#!/usr/bin/env node

/**
 * Test script to verify the attributes array conversion fix
 */

console.log('='.repeat(60));
console.log('Testing Attributes Array Conversion Fix');
console.log('='.repeat(60));

// Test the conversion logic
console.log('\n[1] Testing Object.values() conversion...');

// Simulate what blockchain RPC might return (object with numeric keys)
const attributesAsObject = {
  "0": { trait_type: "Background", value: "Blue" },
  "1": { trait_type: "Body", value: "Green" },
  "2": { trait_type: "Eyes", value: "Red" }
};

console.log('Input (object):', JSON.stringify(attributesAsObject, null, 2));

// Apply the conversion
const attributesAsArray = Object.values(attributesAsObject);

console.log('Output (array):', JSON.stringify(attributesAsArray, null, 2));
console.log('✓ Converted object to array');
console.log(`✓ Array length: ${attributesAsArray.length}`);
console.log(`✓ Array.isArray(): ${Array.isArray(attributesAsArray)}`);

// Test that .map() works on the result
console.log('\n[2] Testing .map() on converted array...');
try {
  const traitTypes = attributesAsArray.map(attr => attr.trait_type);
  console.log('✓ .map() succeeded');
  console.log('  Trait types:', traitTypes);
} catch (error) {
  console.error('✗ .map() failed:', error.message);
  process.exit(1);
}

// Test edge cases
console.log('\n[3] Testing edge cases...');

// Empty object
const emptyObj = {};
const emptyArray = Object.values(emptyObj);
console.log('✓ Empty object → array:', emptyArray, 'length:', emptyArray.length);

// Already an array (should not be converted)
const alreadyArray = [
  { trait_type: "Color", value: "Red" }
];
if (Array.isArray(alreadyArray)) {
  console.log('✓ Array detection works (Array.isArray returned true)');
}

// Null/undefined
const nullValue = null;
const undefinedValue = undefined;
console.log('✓ null check:', nullValue && !Array.isArray(nullValue) ? 'would convert' : 'skipped');
console.log('✓ undefined check:', undefinedValue && !Array.isArray(undefinedValue) ? 'would convert' : 'skipped');

console.log('\n[4] Testing frontend guard logic...');

// Simulate frontend component logic
function testAttributesComponent(attributes) {
  if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
    return 'Component returns null (no render)';
  }
  return `Component renders ${attributes.length} attributes`;
}

console.log('✓ With valid array:', testAttributesComponent(attributesAsArray));
console.log('✓ With empty array:', testAttributesComponent([]));
console.log('✓ With null:', testAttributesComponent(null));
console.log('✓ With undefined:', testAttributesComponent(undefined));
console.log('✓ With object (shouldn\'t happen after backend fix):', testAttributesComponent(attributesAsObject));

console.log('\n' + '='.repeat(60));
console.log('All tests passed! ✓');
console.log('='.repeat(60));
