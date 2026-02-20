#!/usr/bin/env node

/**
 * Export System Test Script
 * 
 * This script tests the complete export system:
 * - Generate RSA keys
 * - Test export request
 * - Check status
 * - Verify download (after payment)
 */

import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:4004/api';

console.log('='.repeat(60));
console.log('Export System Test Script');
console.log('='.repeat(60));

// Test 1: Generate RSA Keys (if not exist)
async function testKeyGeneration() {
  console.log('\n[1] Checking RSA keys...');
  
  const keysDir = path.join(process.cwd(), 'keys');
  const privateKeyPath = path.join(keysDir, 'private.pem');
  const publicKeyPath = path.join(keysDir, 'public.pem');
  
  try {
    await fs.access(privateKeyPath);
    await fs.access(publicKeyPath);
    console.log('✓ RSA keys already exist');
    return true;
  } catch {
    console.log('  Generating new RSA-4096 key pair...');
    
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }, async (err, publicKey, privateKey) => {
        if (err) {
          console.error('✗ Error generating keys:', err);
          reject(err);
          return;
        }

        try {
          await fs.mkdir(keysDir, { recursive: true });
          await fs.writeFile(privateKeyPath, privateKey, { mode: 0o600 });
          await fs.writeFile(publicKeyPath, publicKey, { mode: 0o644 });
          
          console.log('✓ RSA keys generated successfully');
          console.log(`  Private key: ${privateKeyPath}`);
          console.log(`  Public key: ${publicKeyPath}`);
          resolve(true);
        } catch (saveError) {
          console.error('✗ Error saving keys:', saveError);
          reject(saveError);
        }
      });
    });
  }
}

// Test 2: Test Export Request
async function testExportRequest() {
  console.log('\n[2] Testing export request...');
  
  const requestBody = {
    type: 'asset',
    assetId: 'TEST_ASSET',
    includeTransactions: true,
    includeMedia: false,
    retention: 86400 // 24 hours
  };
  
  try {
    const response = await fetch(`${API_BASE}/export/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('✗ Export request failed:', data);
      return null;
    }
    
    console.log('✓ Export request created successfully');
    console.log(`  Export ID: ${data.data.exportId}`);
    console.log(`  Type: ${data.data.type}`);
    console.log(`  Status: ${data.data.status}`);
    console.log(`  Payment Address: ${data.data.payment?.address || 'N/A'}`);
    console.log(`  Amount (USD): $${data.data.payment?.amountUSD || 'N/A'}`);
    console.log(`  Expires: ${data.data.payment?.expiresAt || 'N/A'}`);
    
    return data.data.exportId;
  } catch (error) {
    console.error('✗ Error making export request:', error);
    return null;
  }
}

// Test 3: Check Export Status
async function testExportStatus(exportId) {
  console.log('\n[3] Testing export status check...');
  
  if (!exportId) {
    console.log('  Skipping (no export ID)');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/export/status/${exportId}`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('✗ Status check failed:', data);
      return;
    }
    
    console.log('✓ Export status retrieved successfully');
    console.log(`  Export ID: ${data.data.exportId}`);
    console.log(`  Type: ${data.data.type}`);
    console.log(`  Status: ${data.data.status}`);
    console.log(`  Progress: ${data.data.progress}%`);
    console.log(`  Payment Confirmed: ${data.data.payment.confirmed}`);
    
    if (data.data.result) {
      console.log(`  Asset Name: ${data.data.result.assetName}`);
      console.log(`  IPFS Hash: ${data.data.result.ipfsHash}`);
      console.log(`  Download URL: ${data.data.result.downloadUrl}`);
    }
  } catch (error) {
    console.error('✗ Error checking status:', error);
  }
}

// Test 4: Check Export Health
async function testExportHealth() {
  console.log('\n[4] Testing export system health...');
  
  try {
    const response = await fetch(`${API_BASE}/export/health`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('✗ Health check failed:', data);
      return;
    }
    
    console.log('✓ Export system health check completed');
    console.log(`  Overall Status: ${data.data.status}`);
    console.log(`  IPFS: ${data.data.services.ipfs.status} - ${data.data.services.ipfs.message}`);
    console.log(`  Asset Tokenizer: ${data.data.services.assetTokenizer.status} - ${data.data.services.assetTokenizer.message}`);
  } catch (error) {
    console.error('✗ Error checking health:', error);
  }
}

// Test 5: Get Public Key
async function testGetPublicKey() {
  console.log('\n[5] Testing public key retrieval...');
  
  try {
    const response = await fetch(`${API_BASE}/export/public-key`);
    
    if (!response.ok) {
      console.error('✗ Public key retrieval failed');
      return;
    }
    
    const publicKey = await response.text();
    console.log('✓ Public key retrieved successfully');
    console.log('  Key preview:', publicKey.substring(0, 100) + '...');
  } catch (error) {
    console.error('✗ Error getting public key:', error);
  }
}

// Run all tests
async function runTests() {
  try {
    await testKeyGeneration();
    const exportId = await testExportRequest();
    await testExportStatus(exportId);
    await testExportHealth();
    await testGetPublicKey();
    
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log('✓ All basic tests completed');
    console.log('\nNote: To test the complete flow:');
    console.log('1. Send payment to the provided RTM address');
    console.log('2. Wait for payment confirmation (~1 minute)');
    console.log('3. Check status again to see processing progress');
    console.log('4. Download the export when completed');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n✗ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
