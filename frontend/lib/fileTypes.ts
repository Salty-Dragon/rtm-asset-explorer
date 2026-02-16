// File type utilities for detecting and handling different file types

export interface FileTypeInfo {
  type: 'image' | 'pdf' | 'text' | 'csv' | 'json' | 'xml' | 'video' | 'unknown'
  mimeType?: string
  extension?: string
  category: 'image' | 'document' | 'data' | 'media' | 'unknown'
  canPreview: boolean
  badge?: string
}

// Map of file extensions to file type info
const FILE_TYPE_MAP: Record<string, FileTypeInfo> = {
  // Images
  'png': { type: 'image', mimeType: 'image/png', extension: 'png', category: 'image', canPreview: true },
  'jpg': { type: 'image', mimeType: 'image/jpeg', extension: 'jpg', category: 'image', canPreview: true },
  'jpeg': { type: 'image', mimeType: 'image/jpeg', extension: 'jpeg', category: 'image', canPreview: true },
  'gif': { type: 'image', mimeType: 'image/gif', extension: 'gif', category: 'image', canPreview: true },
  'webp': { type: 'image', mimeType: 'image/webp', extension: 'webp', category: 'image', canPreview: true },
  'svg': { type: 'image', mimeType: 'image/svg+xml', extension: 'svg', category: 'image', canPreview: true },
  
  // Documents
  'pdf': { type: 'pdf', mimeType: 'application/pdf', extension: 'pdf', category: 'document', canPreview: true, badge: 'PDF' },
  'txt': { type: 'text', mimeType: 'text/plain', extension: 'txt', category: 'document', canPreview: true, badge: 'TXT' },
  'md': { type: 'text', mimeType: 'text/markdown', extension: 'md', category: 'document', canPreview: true, badge: 'MD' },
  
  // Data files
  'csv': { type: 'csv', mimeType: 'text/csv', extension: 'csv', category: 'data', canPreview: true, badge: 'CSV' },
  'json': { type: 'json', mimeType: 'application/json', extension: 'json', category: 'data', canPreview: true, badge: 'JSON' },
  'xml': { type: 'xml', mimeType: 'application/xml', extension: 'xml', category: 'data', canPreview: true, badge: 'XML' },

  // Video files
  'mp4': { type: 'video', mimeType: 'video/mp4', extension: 'mp4', category: 'media', canPreview: true, badge: 'MP4' },
  'webm': { type: 'video', mimeType: 'video/webm', extension: 'webm', category: 'media', canPreview: true, badge: 'WEBM' },
  'ogg': { type: 'video', mimeType: 'video/ogg', extension: 'ogg', category: 'media', canPreview: true, badge: 'OGG' },
  'mov': { type: 'video', mimeType: 'video/quicktime', extension: 'mov', category: 'media', canPreview: true, badge: 'MOV' },
  'avi': { type: 'video', mimeType: 'video/x-msvideo', extension: 'avi', category: 'media', canPreview: true, badge: 'AVI' },
  'mkv': { type: 'video', mimeType: 'video/x-matroska', extension: 'mkv', category: 'media', canPreview: true, badge: 'MKV' },
}

// Map of MIME types to file type info
const MIME_TYPE_MAP: Record<string, FileTypeInfo> = {
  'image/png': FILE_TYPE_MAP['png'],
  'image/jpeg': FILE_TYPE_MAP['jpg'],
  'image/gif': FILE_TYPE_MAP['gif'],
  'image/webp': FILE_TYPE_MAP['webp'],
  'image/svg+xml': FILE_TYPE_MAP['svg'],
  'application/pdf': FILE_TYPE_MAP['pdf'],
  'text/plain': FILE_TYPE_MAP['txt'],
  'text/markdown': FILE_TYPE_MAP['md'],
  'text/csv': FILE_TYPE_MAP['csv'],
  'application/json': FILE_TYPE_MAP['json'],
  'application/xml': FILE_TYPE_MAP['xml'],
  'text/xml': FILE_TYPE_MAP['xml'],
  'video/mp4': FILE_TYPE_MAP['mp4'],
  'video/webm': FILE_TYPE_MAP['webm'],
  'video/ogg': FILE_TYPE_MAP['ogg'],
  'video/quicktime': FILE_TYPE_MAP['mov'],
  'video/x-msvideo': FILE_TYPE_MAP['avi'],
  'video/x-matroska': FILE_TYPE_MAP['mkv'],
}

/**
 * Detect file type from CID/filename
 */
export function detectFileType(cidOrFilename: string): FileTypeInfo {
  // Try to extract extension from filename or CID
  const cleanCid = cidOrFilename.replace(/^ipfs:\/\//, '')
  const parts = cleanCid.split('.')
  
  if (parts.length > 1) {
    const extension = parts[parts.length - 1].toLowerCase()
    const fileType = FILE_TYPE_MAP[extension]
    
    if (fileType) {
      return fileType
    }
  }
  
  // Default to unknown
  return {
    type: 'unknown',
    category: 'unknown',
    canPreview: false,
  }
}

/**
 * Detect file type from MIME type
 */
export function detectFileTypeFromMime(mimeType: string): FileTypeInfo {
  const fileType = MIME_TYPE_MAP[mimeType.toLowerCase()]
  
  if (fileType) {
    return fileType
  }
  
  // Check if it's an image type we haven't mapped
  if (mimeType.startsWith('image/')) {
    return {
      type: 'image',
      mimeType,
      category: 'image',
      canPreview: true,
    }
  }

  // Check if it's a video type we haven't mapped
  if (mimeType.startsWith('video/')) {
    return {
      type: 'video',
      mimeType,
      category: 'media',
      canPreview: true,
    }
  }
  
  // Default to unknown
  return {
    type: 'unknown',
    mimeType,
    category: 'unknown',
    canPreview: false,
  }
}

/**
 * Check if content appears to be encrypted or password-protected
 */
export function isEncrypted(data: Uint8Array | string): boolean {
  // Check for common encrypted file signatures
  if (data instanceof Uint8Array) {
    // PDF password protection signature
    if (data.length > 4 && 
        data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
      // This is a PDF - check for encryption in first 1KB
      const header = new TextDecoder().decode(data.slice(0, Math.min(1024, data.length)))
      if (header.includes('/Encrypt')) {
        return true
      }
    }
    
    // Check for high entropy (possible encryption)
    // Encrypted files typically have very high entropy
    if (data.length > 100) {
      const entropy = calculateEntropy(data.slice(0, 512))
      // Entropy above 7.5 suggests encryption
      if (entropy > 7.5) {
        return true
      }
    }
  } else if (typeof data === 'string') {
    // Check for encrypted text markers
    if (data.includes('-----BEGIN ENCRYPTED') || 
        data.includes('-----BEGIN PGP MESSAGE') ||
        data.includes('Salted__')) {
      return true
    }
  }
  
  return false
}

/**
 * Calculate Shannon entropy of data
 * 
 * We use 512 bytes as a sample size because it's large enough to get a representative
 * distribution of byte values while being small enough to be efficient.
 * 
 * The threshold of 7.5 bits is used because:
 * - Random/encrypted data typically has entropy > 7.5 (approaching 8.0)
 * - Compressed data has entropy around 7-7.5
 * - Plain text has entropy around 4-5
 * - This threshold provides a good balance to detect encryption while minimizing false positives
 */
function calculateEntropy(data: Uint8Array): number {
  const freq: Record<number, number> = {}
  
  // Count frequencies
  for (const byte of data) {
    freq[byte] = (freq[byte] || 0) + 1
  }
  
  // Calculate entropy
  let entropy = 0
  const len = data.length
  
  for (const count of Object.values(freq)) {
    const probability = count / len
    entropy -= probability * Math.log2(probability)
  }
  
  return entropy
}

/**
 * Validate if a string looks like a valid IPFS CID.
 * Valid CIDs are either:
 * - CIDv0: Base58btc-encoded, starts with "Qm" and is 46 characters long
 * - CIDv1: Typically starts with "bafy" (base32) or "z" (base58btc), alphanumeric
 * 
 * This is a heuristic check - it won't catch all invalid CIDs but will filter
 * out obviously malformed ones (random characters, special chars, etc.)
 */
export function isValidCid(cid: string): boolean {
  const cleanCid = cid.replace(/^ipfs:\/\//, '')
  
  // Must not be empty
  if (!cleanCid || cleanCid.length === 0) return false
  
  // CID should only contain alphanumeric characters (base58/base32)
  // Allow dots only for extension-based filenames (e.g., "QmXxx.pdf")
  // But reject CIDs that are just dots/numbers like "1.2.3.4.5..."
  const basePart = cleanCid.split('.')[0]
  if (!basePart || basePart.length === 0) return false
  
  // The base part (before any extension) must be alphanumeric
  if (!/^[a-zA-Z0-9]+$/.test(basePart)) return false
  
  // CIDv0: starts with "Qm" and is 46 chars (SHA-256 multihash in base58btc)
  if (basePart.startsWith('Qm') && basePart.length === 46) return true
  
  // CIDv1 base32 (starts with "bafy"): minimum ~59 chars for SHA-256 content
  if (basePart.startsWith('bafy') && basePart.length >= 50) return true
  
  // CIDv1 base58btc (starts with "z"): minimum ~49 chars for SHA-256 content
  if (basePart.startsWith('z') && basePart.length >= 40) return true
  
  return false
}

/**
 * Get placeholder image for file type
 */
export function getPlaceholderImage(fileType: FileTypeInfo, encrypted: boolean = false): string {
  if (encrypted) {
    return '/placeholder-encrypted.svg'
  }
  
  switch (fileType.type) {
    case 'pdf':
      return '/placeholder-pdf.svg'
    case 'text':
    case 'csv':
    case 'json':
    case 'xml':
      return '/placeholder-text.svg'
    case 'video':
      return '/placeholder-video.svg'
    case 'unknown':
      return '/placeholder-file.svg'
    default:
      return '/placeholder-asset.svg'
  }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
