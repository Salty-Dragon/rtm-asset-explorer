# Export System Setup Guide

This guide explains how to set up and configure the tokenized export system for the Raptoreum Asset Explorer.

## Overview

The export system generates cryptographically signed, blockchain-verified exports in multiple formats (JSON, CSV, PDF). It requires payment in Litecoin and creates blockchain tokens for verification.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure the following sections:

#### Basic Export Configuration

```env
# Export pricing and limits
EXPORT_PRICE_USD=2.00
EXPORT_PRICE_VARIANCE=0.01
EXPORT_MAX_ASSETS=1000
EXPORT_MAX_TRANSACTIONS=10000
EXPORT_MAX_ADDRESSES=100
EXPORT_MAX_FILE_SIZE_MB=100
EXPORT_CONCURRENT_LIMIT=3
EXPORT_STORAGE_PATH=./exports
```

#### Signing Keys (Auto-generated on first run)

```env
EXPORT_PRIVATE_KEY_PATH=./keys/private.pem
EXPORT_PUBLIC_KEY_PATH=./keys/public.pem
```

The system will automatically generate RSA-4096 keys on first startup if they don't exist.

### 3. External Services (Optional but Recommended)

#### Litecoin Payment Processing

```env
LITECOIN_RPC_ENABLED=true
LITECOIN_RPC_HOST=127.0.0.1
LITECOIN_RPC_PORT=9332
LITECOIN_RPC_USER=your_litecoin_user
LITECOIN_RPC_PASSWORD=your_litecoin_password
PAYMENT_CHECK_INTERVAL_MS=60000
```

**Note:** If disabled, payment verification will not work but the system will still function for testing.

#### IPFS Storage

```env
IPFS_ENABLED=true
IPFS_HOST=127.0.0.1
IPFS_PORT=5001
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
```

**Note:** If disabled, IPFS upload will be skipped but exports will still be generated locally.

#### Blockchain Tokenization

```env
ASSET_TOKENIZATION_ENABLED=true
REMOTE_RAPTOREUMD_HOST=127.0.0.1
REMOTE_RAPTOREUMD_PORT=10225
REMOTE_RAPTOREUMD_USER=your_rtm_user
REMOTE_RAPTOREUMD_PASSWORD=your_rtm_password
EXPORT_TOKEN_OWNER_ADDRESS=your_rtm_address
```

**Note:** If disabled, blockchain token creation will be skipped but exports will still be generated.

### 4. Start the Server

```bash
npm start
```

The export system will initialize automatically along with the main server.

## Testing

### Run Integration Tests

```bash
npm run test:integration
```

This tests all core export functionality without requiring external services.

### Test Export Flow

```bash
npm run test:export
```

This tests the complete export request flow including API endpoints. Requires the server to be running.

## API Endpoints

### Request Export

```bash
POST /api/export/request
Content-Type: application/json

{
  "type": "asset",
  "assetId": "MY_ASSET",
  "includeTransactions": true,
  "includeMedia": false,
  "retention": 604800
}
```

### Check Status

```bash
GET /api/export/status/:exportId
```

### Download Export

```bash
GET /api/export/download/:exportId
```

### Verify Export

```bash
GET /api/export/verify/:assetName
```

Note: Asset name should be URL-encoded (e.g., `RTM_EXPORTS%2FASSET_20260214_hash`)

### Get Public Key

```bash
GET /api/export/public-key
```

### Health Check

```bash
GET /api/export/health
```

## Directory Structure

```
backend/
├── exports/           # Generated export files (auto-created)
│   └── temp/         # Temporary working directory
├── keys/             # RSA signing keys (auto-generated)
│   ├── private.pem   # Private key (keep secure!)
│   └── public.pem    # Public key (shared for verification)
├── src/
│   ├── models/
│   │   └── Export.js           # Export database model
│   ├── services/
│   │   ├── litecoinClient.js   # Litecoin RPC client
│   │   ├── pricingService.js   # USD/LTC pricing
│   │   ├── exportGenerator.js  # File generation
│   │   ├── exportSigner.js     # Digital signatures
│   │   ├── ipfsService.js      # IPFS upload
│   │   ├── assetTokenizer.js   # Blockchain tokens
│   │   ├── paymentMonitor.js   # Payment monitoring
│   │   └── queueProcessor.js   # Queue management
│   └── routes/
│       └── export.js           # API routes
└── test-*.js         # Test scripts
```

## Security Considerations

### Private Key Protection

The private signing key (`keys/private.pem`) is **critical** for system security:

- Keep it secure with proper file permissions (600)
- Never commit it to version control
- Backup securely in a safe location
- Rotate keys periodically

### Environment Variables

Store sensitive credentials in `.env`:

- Never commit `.env` to version control
- Use strong passwords for RPC credentials
- Restrict network access to RPC services

## Development Mode

For development without external dependencies:

1. Keep external services disabled in `.env`:
   ```env
   LITECOIN_RPC_ENABLED=false
   IPFS_ENABLED=false
   ASSET_TOKENIZATION_ENABLED=false
   ```

2. The system will still:
   - Accept export requests
   - Generate files locally
   - Sign exports
   - Provide download links

3. Payment verification, IPFS upload, and blockchain tokenization will be skipped.

## Production Deployment

For production deployment:

1. **Enable all external services**
2. **Set up Litecoin pruned node** for payment processing
3. **Configure IPFS node** for permanent storage
4. **Set up remote Raptoreumd** with sufficient RTM for token creation
5. **Generate strong RPC passwords**
6. **Configure firewall** to restrict RPC access
7. **Set up monitoring** for payment monitor and queue processor
8. **Configure backup** for export files and keys
9. **Set appropriate retention periods** based on storage capacity

## Monitoring

The export system provides several monitoring endpoints:

- **Health Check**: `GET /api/export/health` - Check all service status
- **Queue Stats**: Monitor queue processor for export progress
- **Payment Monitor**: Check logs for payment confirmations
- **Database**: Monitor Export collection for status updates

## Troubleshooting

### Export Stuck in "Pending Payment"

- Check Litecoin RPC connection
- Verify payment was sent to correct address
- Check payment monitor logs
- Ensure payment amount is within variance tolerance

### Export Fails During Processing

- Check queue processor logs
- Verify MongoDB connection
- Check Redis connection
- Ensure sufficient disk space

### IPFS Upload Fails

- Verify IPFS daemon is running
- Check IPFS API port is accessible
- Ensure sufficient IPFS storage space

### Blockchain Token Creation Fails

- Check remote Raptoreumd connection
- Verify wallet has sufficient RTM
- Check asset name doesn't already exist

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review error messages in export record
- Consult EXPORTS.md for detailed documentation
- Open an issue on GitHub

## License

MIT License - See LICENSE file for details
