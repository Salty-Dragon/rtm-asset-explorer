// File type utilities for detecting and handling different file types

export interface FileTypeInfo {
  type: 'image' | 'pdf' | 'text' | 'csv' | 'json' | 'xml' | 'unknown'
  mimeType?: string
  extension?: string
  category: 'image' | 'document' | 'data' | 'unknown'
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
