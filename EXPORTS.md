# Export System Documentation

## Overview

The Raptoreum Asset Explorer export system provides cryptographically signed, blockchain-verified exports for legal compliance, court documentation, and data verification purposes.

**Key Features:**
- **Cost**: All exports cost $2.00 USD (paid in Litecoin)
- **Security**: Cryptographically signed and tokenized on the Raptoreum blockchain
- **Verification**: Verifiable via on-chain sub-assets under `RTM_EXPORTS/`
- **Multiple Formats**: Every export includes JSON, CSV, and PDF formats
- **Legal Compliance**: Includes Certificate of Authenticity for legal use cases

## Export Types

### ASSET
Single asset export with complete history including:
- Asset metadata and properties
- Full transfer history
- Current ownership information
- Associated IPFS content metadata
- Transaction details

### ADDR
Address history and holdings export including:
- Address balance and activity
- All transactions involving the address
- Asset holdings and history
- Token transfers
- Activity timeline

### MULTI
Multiple assets export for bulk data retrieval:
- Batch export of up to 1000 assets (configurable)
- Combined transfer histories
- Aggregated statistics
- Cross-asset analytics

### LEGAL
Legal/court documentation package with formal attestation:
- Complete asset or address documentation
- Certificate of Authenticity
- Blockchain verification data
- Digital signatures for evidence purposes
- Required legal metadata (case reference, court name, purpose)

### PROV
Provenance/ownership chain export:
- Complete ownership history
- Chain of custody documentation
- Transfer verification data
- Timestamp verification
- Blockchain proof of ownership

## Payment Process

The export system uses Litecoin for payment processing to ensure decentralized, verifiable transactions:

### Step 1: Initiate Export Request
User submits export request via API with desired type and parameters.

### Step 2: Payment Address Generated
System generates a unique, single-use Litecoin payment address for the request.

### Step 3: Payment Window
- User has 30 minutes to complete payment
- Payment amount: $2.00 USD equivalent in LTC
- ±1% variance accepted for price fluctuations
- Real-time exchange rate from CoinGecko API

### Step 4: Payment Confirmation
- System monitors Litecoin blockchain for payment
- Confirmation required before processing begins
- Payment status updated in real-time

### Step 5: Export Processing
- Request added to processing queue
- Maximum 3 concurrent exports processed
- Status updates available via API
- Estimated processing time provided

### Step 6: File Generation
Export files generated in all three formats:
- **JSON**: Machine-readable structured data
- **CSV**: Spreadsheet-compatible format
- **PDF**: Human-readable formatted report
- All packaged in a ZIP archive

### Step 7: Blockchain Tokenization
- Sub-asset created on remote Raptoreumd instance
- Token name follows convention: `RTM_EXPORTS/[TYPE]_[DATE]_[HASH]`
- Unique NFT (maxMintCount: 1)
- Cryptographically signed for verification

### Step 8: Delivery
User receives:
- Download link (expires based on retention setting)
- Verification token for authenticity checks
- Blockchain token name for verification

## Export Contents

Each export contains multiple formats to serve different use cases:

### JSON Format (data.json)
Structured, machine-readable data:
```json
{
  "exportInfo": {
    "type": "asset",
    "exportId": "exp_abc123def456",
    "createdAt": "2026-02-14T12:00:00Z",
    "version": "1.0"
  },
  "verification": {
    "assetName": "RTM_EXPORTS/ASSET_20260214_a3f2c1b9",
    "txid": "abc123...",
    "ipfsHash": "QmX...",
    "signature": "3045...",
    "fileHash": "sha256:..."
  },
  "data": {
    // Export-specific data
  }
}
```

### CSV Format (data.csv)
Spreadsheet-compatible format:
- Flat structure for easy import
- Compatible with Excel, Google Sheets
- Includes all relevant fields
- Properly escaped and formatted

### PDF Format (report.pdf)
Human-readable formatted report:
- Professional layout and formatting
- Headers with export metadata
- Certificate of Authenticity (for legal exports)
- QR codes for verification
- Blockchain verification links
- Digital signature information

### Optional: IPFS Media
If "includeMedia" option is selected:
- `media/` folder containing downloaded IPFS content
- Referenced media files from asset metadata
- Organized by content type
- Original filenames preserved

## Legal Export Attestation

Legal exports include a comprehensive Certificate of Authenticity:

### Certificate Contents

**Export Information:**
- Export generation timestamp (ISO 8601 format)
- Export type and ID
- Asset or address identifiers

**Blockchain Verification:**
- Token asset name (e.g., `RTM_EXPORTS/LEGAL_20260214_a3f2c1b9`)
- Transaction ID (txid) on Raptoreum blockchain
- Block height and confirmation count
- Blockchain explorer link

**File Integrity:**
- SHA-256 file hash
- IPFS content hash (CID)
- Digital signature (RSA-4096)
- Public key for signature verification

**Legal Metadata:**
(Required for legal export type)
- Case reference number
- Court name and jurisdiction
- Purpose/description of export
- Requesting party information (optional)

**Verification Instructions:**
- Steps to verify on-chain token
- IPFS content verification process
- Digital signature validation
- Public verification URL

### Example Certificate

```
═══════════════════════════════════════════════════════════
            RAPTOREUM ASSET EXPLORER
         CERTIFICATE OF AUTHENTICITY
═══════════════════════════════════════════════════════════

Export Type: LEGAL
Generated: 2026-02-14T12:00:00Z
Export ID: exp_abc123def456

CASE INFORMATION
────────────────────────────────────────────────────────────
Case Reference: Case #2024-1234
Court: Superior Court of California
Purpose: Evidence for trademark dispute

BLOCKCHAIN VERIFICATION
────────────────────────────────────────────────────────────
Token Asset: RTM_EXPORTS/LEGAL_20260214_a3f2c1b9
Transaction ID: abc123def456789...
Block Height: 123456
Confirmations: 6+
Explorer: https://explorer.raptoreum.com/tx/abc123...

FILE INTEGRITY
────────────────────────────────────────────────────────────
File Hash (SHA-256):
  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

IPFS Content Hash:
  QmX7j3k2L9mN4o5P6q7R8s9T0u1V2w3X4y5Z6a7B8c9D0e1

Digital Signature:
  3045022100abcd...

VERIFICATION
────────────────────────────────────────────────────────────
Verify this export at:
https://assets.raptoreum.com/api/export/verify/RTM_EXPORTS/LEGAL_20260214_a3f2c1b9

Public Key: See SECURITY.md or
https://assets.raptoreum.com/api/export/public-key

═══════════════════════════════════════════════════════════
This certificate provides cryptographic proof that this
export is authentic and unmodified. The blockchain token
serves as permanent, immutable verification.
═══════════════════════════════════════════════════════════
```

## Limits

All limits are configurable via environment variables to accommodate different server capacities and requirements.

### Asset and Data Limits
- **Max Assets per Export**: 1000 (default)
  - Applies to MULTI type exports
  - Prevents excessive data retrieval
  - Configurable via `EXPORT_MAX_ASSETS`

- **Max Transactions per Export**: 10,000 (default)
  - Limits transaction history size
  - Prevents performance issues
  - Configurable via `EXPORT_MAX_TRANSACTIONS`

- **Max Addresses per Export**: 100 (default)
  - For ADDR type exports
  - Batch address limits
  - Configurable via `EXPORT_MAX_ADDRESSES`

### Processing Limits
- **Max File Size**: 100MB
  - Compressed ZIP file limit
  - Includes all formats and media
  - Configurable via `EXPORT_MAX_FILE_SIZE_MB`

- **Processing Timeout**: 10 minutes
  - Maximum time for export generation
  - Prevents hung processes
  - Configurable via `EXPORT_MAX_PROCESSING_TIME_SEC`

### Rate Limits
- **Rate Limit**: 10 exports per hour per IP
  - Prevents abuse and spam
  - Applied per IP address
  - Configurable via `EXPORT_RATE_LIMIT_PER_HOUR`

- **Queue Size**: 50 maximum
  - Maximum pending exports
  - Queue management
  - Configurable via `EXPORT_QUEUE_MAX_SIZE`

- **Concurrent Processing**: 3 exports
  - Maximum simultaneous processing
  - Resource management
  - Configurable via `EXPORT_CONCURRENT_LIMIT`

## Retention

Export files are available for download for a configurable period, after which they can be retrieved via IPFS.

### Retention Options
Users can select retention period at request time:
- **1 hour**: Quick exports, minimal storage
- **24 hours**: Standard retention (default)
- **7 days**: Extended availability
- **30 days**: Maximum retention

### After Expiration
- **Direct Download**: No longer available from server
- **IPFS Access**: Permanently available via IPFS hash
- **Blockchain Verification**: Always available via token asset
- **Re-download**: Can request new export with payment

### Storage Considerations
- Expired exports automatically deleted from server
- IPFS content persists on distributed network
- Blockchain token remains permanently on-chain
- No user data is lost, only direct download convenience

## Verification

Multiple verification methods ensure export authenticity and integrity:

### Public Verification Endpoint
**URL**: `/api/export/verify/:assetName`

Returns comprehensive verification information:
- On-chain asset existence
- IPFS content availability
- Digital signature validity
- File integrity status
- Creation timestamp
- Export metadata

### On-Chain Asset Lookup
- Query Raptoreum blockchain directly
- Verify token asset exists under `RTM_EXPORTS/`
- Check referenceHash matches IPFS hash
- Confirm creation transaction

### IPFS Content Verification
- Retrieve content from IPFS using hash
- Recalculate content hash
- Compare with stored hash
- Verify content integrity

### Digital Signature Validation
- Extract signature from export
- Obtain server public key (published in SECURITY.md)
- Verify signature matches content
- Confirm signing key authenticity

### Server Public Key
Published in SECURITY.md and available via API:
```
-----BEGIN PUBLIC KEY-----
[RSA-4096 Public Key]
[To be generated during deployment]
-----END PUBLIC KEY-----
```

## File Format

### Filename Convention
```
raptoreum_export_[identifier]_YYYY-MM-DD.zip
```

**Examples:**
- `raptoreum_export_COOL_ASSET_2026-02-14.zip`
- `raptoreum_export_RAddress123_2026-02-14.zip`
- `raptoreum_export_multi_2026-02-14.zip`

### ZIP Contents
```
raptoreum_export_COOL_ASSET_2026-02-14.zip
├── data.json          # Machine-readable data
├── data.csv           # Spreadsheet format
├── report.pdf         # Human-readable report
└── media/             # Optional IPFS content
    ├── image1.png
    ├── image2.jpg
    └── metadata.json
```

### Content Structure

**data.json**:
- Complete structured data
- Verification metadata
- Export configuration
- Timestamps and signatures

**data.csv**:
- Flattened data structure
- Headers with field names
- Properly escaped values
- UTF-8 encoding

**report.pdf**:
- Title page with export info
- Certificate of Authenticity
- Data tables and summaries
- QR codes for verification
- Footer with page numbers

**media/** (optional):
- Downloaded IPFS content
- Original filenames
- Content type organized
- Metadata manifest

## Token Naming Convention

Blockchain tokens follow a strict naming convention for consistency and verification:

### Format
```
RTM_EXPORTS/[TYPE]_[YYYYMMDD]_[hash8]
```

### Components

**Prefix**: `RTM_EXPORTS/`
- All export tokens under this namespace
- Easy filtering and identification
- Separated from other assets

**Type**: Export type identifier
- `ASSET` - Single asset export
- `ADDR` - Address export
- `MULTI` - Multiple assets export
- `LEGAL` - Legal documentation
- `PROV` - Provenance/ownership chain

**Date**: `YYYYMMDD`
- Export creation date
- Sortable chronologically
- Human-readable

**Hash**: 8-character hash
- Derived from export content
- Ensures uniqueness
- Deterministic generation
- Lowercase hexadecimal

### Examples
```
RTM_EXPORTS/ASSET_20260214_a3f2c1b9
RTM_EXPORTS/LEGAL_20260214_f7e9c2d1
RTM_EXPORTS/MULTI_20260214_b4a8e6f3
RTM_EXPORTS/ADDR_20260214_9c3e5a7b
RTM_EXPORTS/PROV_20260214_d2f4e8c6
```

### Constraints
- **Maximum Length**: 128 characters (Raptoreum limit)
- **Character Set**: A-Z, 0-9, underscore, forward slash
- **Case**: Uppercase (except hash)
- **Uniqueness**: Hash ensures no duplicates

### Hash Generation
```javascript
// Pseudocode for hash generation
const content = JSON.stringify({
  type: exportType,
  date: timestamp,
  assetId: assetId,
  requestData: requestHash
});
const hash = SHA256(content).substring(0, 8);
```

## API Integration

For detailed API endpoint documentation, see [API.md](API.md#export-endpoints).

### Quick Start

1. **Request Export**:
   ```bash
   curl -X POST https://assets.raptoreum.com/api/export/request \
     -H "Content-Type: application/json" \
     -d '{
       "type": "asset",
       "assetId": "MY_ASSET",
       "includeMedia": false,
       "retention": 86400
     }'
   ```

2. **Pay Invoice**:
   Send $2.00 USD in LTC to provided address within 30 minutes.

3. **Check Status**:
   ```bash
   curl https://assets.raptoreum.com/api/export/status/exp_abc123
   ```

4. **Download Export**:
   ```bash
   curl -o export.zip https://assets.raptoreum.com/api/export/download/exp_abc123
   ```

5. **Verify Export**:
   ```bash
   curl https://assets.raptoreum.com/api/export/verify/RTM_EXPORTS/ASSET_20260214_a3f2c1b9
   ```

## Security Considerations

See [SECURITY.md](SECURITY.md#export-system-security) for comprehensive security documentation including:
- Digital signature implementation
- Payment security measures
- Token asset security
- Attack vector mitigation
- Key management

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md#export-system-development) for development setup including:
- Environment variables
- Local testing procedures
- Key generation
- Mock payment testing

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md#environment-variables) for production deployment including:
- Environment configuration
- Monitoring setup
- Performance optimization
- Backup procedures

## Support

For issues, questions, or feature requests related to the export system:
- **Email**: support@raptoreum.com
- **GitHub**: https://github.com/Raptoreum/rtm-asset-explorer/issues
- **Documentation**: https://assets.raptoreum.com/docs

## License

The export system is part of the Raptoreum Asset Explorer project and follows the same license terms.
