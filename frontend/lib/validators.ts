// Input validation utilities

/**
 * Validate a Raptoreum address
 * Raptoreum addresses start with 'R' and are 34 characters long
 */
export function isValidAddress(address: string): boolean {
  if (!address) return false
  return /^R[a-km-zA-HJ-NP-Z1-9]{33}$/.test(address)
}

/**
 * Validate a transaction ID (64 character hex string)
 */
export function isValidTxid(txid: string): boolean {
  if (!txid) return false
  return /^[a-fA-F0-9]{64}$/.test(txid)
}

/**
 * Validate an asset ID (alphanumeric with underscores)
 */
export function isValidAssetId(assetId: string): boolean {
  if (!assetId) return false
  // Asset names can contain letters, numbers, underscores, and hashes
  // They must be at least 3 characters long
  return /^[A-Z0-9_#]{3,}$/i.test(assetId)
}

/**
 * Validate an IPFS CID (CIDv0 or CIDv1)
 */
export function isValidCID(cid: string): boolean {
  if (!cid) return false
  // CIDv0 starts with Qm and is 46 characters
  const cidv0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/
  // CIDv1 starts with bafy, bafk, or bafz
  const cidv1Pattern = /^baf[ykz][a-z2-7]{50,}/
  return cidv0Pattern.test(cid) || cidv1Pattern.test(cid)
}

/**
 * Validate a block hash (64 character hex string)
 */
export function isValidBlockHash(hash: string): boolean {
  return isValidTxid(hash) // Same format as txid
}

/**
 * Validate a block height (positive integer)
 */
export function isValidBlockHeight(height: string | number): boolean {
  const num = typeof height === 'string' ? parseInt(height, 10) : height
  return !isNaN(num) && num >= 0 && Number.isInteger(num)
}

/**
 * Validate an email address
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}

/**
 * Detect the type of search query
 */
export function detectQueryType(
  query: string
): 'address' | 'txid' | 'block_hash' | 'block_height' | 'asset' | 'cid' | 'text' {
  if (!query) return 'text'

  const trimmed = query.trim()

  // Check for IPFS CID
  if (isValidCID(trimmed)) return 'cid'

  // Check for address
  if (isValidAddress(trimmed)) return 'address'

  // Check for txid or block hash
  if (isValidTxid(trimmed)) {
    // Could be either txid or block hash, default to txid
    return 'txid'
  }

  // Check for block height (numeric only)
  if (/^\d+$/.test(trimmed) && isValidBlockHeight(trimmed)) {
    return 'block_height'
  }

  // Check for asset name
  if (isValidAssetId(trimmed)) return 'asset'

  // Default to text search
  return 'text'
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: number, limit?: number): { page: number; limit: number } {
  const validPage = page && page > 0 ? Math.floor(page) : 1
  const validLimit = limit && limit > 0 && limit <= 100 ? Math.floor(limit) : 20
  return { page: validPage, limit: validLimit }
}
