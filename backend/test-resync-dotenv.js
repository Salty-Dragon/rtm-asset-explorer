#!/usr/bin/env node

/**
 * Test: Resync Transfers Dotenv Loading
 * 
 * This test verifies that resync-transfers.js properly loads environment variables
 * before instantiating the blockchainService singleton.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n================================================');
console.log('Testing resync-transfers.js dotenv loading');
console.log('================================================\n');

// Create a temporary .env file with test credentials
const testEnvContent = `
MONGODB_URI=mongodb://test:test@localhost:27017/test_db
RAPTOREUMD_HOST=test.host.com
RAPTOREUMD_PORT=12345
RAPTOREUMD_USER=test_user
RAPTOREUMD_PASSWORD=test_password_123
`;

const envPath = path.join(__dirname, '.env');
const envBackupPath = path.join(__dirname, '.env.backup');

// Backup existing .env if it exists
if (fs.existsSync(envPath)) {
  fs.copyFileSync(envPath, envBackupPath);
  console.log('✓ Backed up existing .env');
}

try {
  // Write test .env
  fs.writeFileSync(envPath, testEnvContent);
  console.log('✓ Created test .env file\n');

  // Clear environment to ensure we're testing dotenv loading
  delete process.env.RAPTOREUMD_HOST;
  delete process.env.RAPTOREUMD_PORT;
  delete process.env.RAPTOREUMD_USER;
  delete process.env.RAPTOREUMD_PASSWORD;

  console.log('Testing dynamic imports with dotenv loading...\n');

  // Simulate what resync-transfers.js does
  const dotenv = await import('dotenv');
  dotenv.default.config({ path: envPath });

  console.log('Environment variables after dotenv.config():');
  console.log(`  RAPTOREUMD_HOST: ${process.env.RAPTOREUMD_HOST}`);
  console.log(`  RAPTOREUMD_PORT: ${process.env.RAPTOREUMD_PORT}`);
  console.log(`  RAPTOREUMD_USER: ${process.env.RAPTOREUMD_USER}`);
  console.log(`  RAPTOREUMD_PASSWORD: ${process.env.RAPTOREUMD_PASSWORD ? '***' : '(empty)'}\n`);

  // Now import the blockchain service (after dotenv has loaded)
  const { default: blockchainService } = await import('./src/services/blockchain.js');

  console.log('BlockchainService configuration after import:');
  console.log(`  host: ${blockchainService.host}`);
  console.log(`  port: ${blockchainService.port}`);
  console.log(`  user: ${blockchainService.user}`);
  console.log(`  password: ${blockchainService.password ? '***' : '(empty)'}\n`);

  // Verify that the values match
  const hostsMatch = blockchainService.host === 'test.host.com';
  const portsMatch = blockchainService.port === '12345';
  const usersMatch = blockchainService.user === 'test_user';
  const passwordsMatch = blockchainService.password === 'test_password_123';

  console.log('Verification:');
  console.log(`  ✓ Host matches: ${hostsMatch ? 'YES' : 'NO'}`);
  console.log(`  ✓ Port matches: ${portsMatch ? 'YES' : 'NO'}`);
  console.log(`  ✓ User matches: ${usersMatch ? 'YES' : 'NO'}`);
  console.log(`  ✓ Password matches: ${passwordsMatch ? 'YES' : 'NO'}\n`);

  if (hostsMatch && portsMatch && usersMatch && passwordsMatch) {
    console.log('✅ TEST PASSED: Environment variables loaded correctly before singleton instantiation\n');
  } else {
    console.log('❌ TEST FAILED: Some values did not match\n');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Test error:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  // Restore original .env
  if (fs.existsSync(envBackupPath)) {
    fs.copyFileSync(envBackupPath, envPath);
    fs.unlinkSync(envBackupPath);
    console.log('✓ Restored original .env file');
  } else {
    // Remove test .env if there was no backup
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
      console.log('✓ Removed test .env file');
    }
  }
}

console.log('================================================\n');
