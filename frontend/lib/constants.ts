// Application constants

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://assets.raptoreum.com/api/v1'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://assets.raptoreum.com'

// IPFS Configuration
export const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://assets.raptoreum.com/ipfs'
export const IPFS_FALLBACK_URL = process.env.NEXT_PUBLIC_IPFS_FALLBACK_URL || 'https://ipfs.io/ipfs'

export const IPFS_GATEWAYS = [
  IPFS_GATEWAY_URL,
  IPFS_FALLBACK_URL,
  'https://gateway.pinata.cloud/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
]

// Site Configuration
export const SITE_NAME = 'Raptoreum Asset Explorer'
export const SITE_DESCRIPTION = 'Explore Raptoreum blockchain assets, NFTs, and transactions'

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Cache Times (milliseconds)
export const CACHE_TIMES = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 60 * 60 * 1000, // 1 hour
}

// React Query Configuration
export const STALE_TIME = 60 * 1000 // 1 minute
export const CACHE_TIME = 5 * 60 * 1000 // 5 minutes

// Debounce Delays
export const SEARCH_DEBOUNCE_MS = 300
export const INPUT_DEBOUNCE_MS = 500

// Responsive Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

// Asset Types
export const ASSET_TYPES = {
  FUNGIBLE: 'fungible',
  NON_FUNGIBLE: 'nft',
} as const

// Sort Options
export const SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
} as const

// Export Configuration
export const EXPORT_POLL_INTERVAL = 10 * 1000 // 10 seconds
export const PAYMENT_TIMEOUT = 30 * 60 * 1000 // 30 minutes

// Export Types
export const EXPORT_TYPES = {
  STANDARD: 'standard',
  PROVENANCE: 'provenance',
  LEGAL: 'legal',
} as const

// Export Status
export const EXPORT_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const

// Social Links
export const SOCIAL_LINKS = {
  WEBSITE: 'https://raptoreum.com',
  GITHUB: 'https://github.com/Raptor3um',
  DISCORD: 'https://discord.gg/raptoreum',
  TWITTER: 'https://twitter.com/raptoreum',
}

// Network Info
export const NETWORK_INFO = {
  NAME: 'Raptoreum',
  TICKER: 'RTM',
  BLOCK_TIME: 120, // seconds
}
