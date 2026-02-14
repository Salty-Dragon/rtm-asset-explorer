/**
 * Test script to verify environment variable validation
 * Tests that the sync daemon properly validates required environment variables
 * 
 * Note: Removed shebang as this uses ES modules and should be run with: node test-env-validation.js
 */

import dotenv from 'dotenv';

console.log('Testing Environment Variable Validation\n');
console.log('='.repeat(60));

// Load .env.example to see what's expected
dotenv.config({ path: '.env.example' });

// List of required variables (matching sync-daemon.js)
const requiredVars = [
  'MONGODB_URI',
  'RAPTOREUMD_HOST',
  'RAPTOREUMD_PORT',
  'RAPTOREUMD_USER',
  'RAPTOREUMD_PASSWORD'
];

console.log('\nChecking Required Environment Variables:\n');

let allPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ SET' : '❌ MISSING';
  if (!value) allPresent = false;
  
  // Mask passwords
  let displayValue = value;
  if (varName.includes('PASSWORD') && value) {
    displayValue = '***MASKED***';
  }
  
  console.log(`${status} | ${varName.padEnd(30)} | ${displayValue || '(not set)'}`);
});

console.log('\n' + '='.repeat(60));

if (allPresent) {
  console.log('\n✅ All required variables are configured in .env.example');
} else {
  console.log('\n⚠️  Some variables missing (expected for .env.example)');
}

console.log('\n' + '='.repeat(60));
console.log('\nNOTE: To run the sync daemon, you need to:');
console.log('1. Copy .env.example to .env');
console.log('2. Fill in the actual values for all required variables');
console.log('3. Set SYNC_ENABLED=true');
console.log('4. Start with: pm2 start ecosystem.config.js');
console.log('   OR: node src/services/sync-daemon.js');
console.log('\n' + '='.repeat(60));
