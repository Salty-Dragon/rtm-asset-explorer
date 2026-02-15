// TypeScript type definitions for API responses and data models

// ============================================
// Base Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId: string
    dataSource?: 'cache' | 'blockchain' | 'ipfs'
  }
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ============================================
// Asset Types
// ============================================

export interface AssetMetadata {
  name?: string
  description?: string
  image?: string
  imageUrl?: string
  external_url?: string
  animation_url?: string
  attributes?: AssetAttribute[]
  properties?: Record<string, any>
  [key: string]: any
}

export interface AssetAttribute {
  trait_type: string
  value: string | number
  display_type?: string
}

export interface Asset {
  _id: string
  assetId: string
  name: string
  type: 'fungible' | 'nft'
  amount: number
  units: number
  reissuable: boolean
  hasIpfs: boolean
  ipfsHash?: string
  txid: string
  height: number
  blockTime: number
  owner: string
  metadata?: AssetMetadata
  transferCount: number
  views: number
  isSubAsset: boolean
  parentAssetName?: string
  createdAt: string
  updatedAt: string
}

export interface AssetTransfer {
  _id: string
  assetId: string
  assetName: string
  txid: string
  vout: number
  from?: string
  to: string
  amount: number
  height: number
  blockTime: number
  timestamp: string
}

// ============================================
// Blockchain Types
// ============================================

export interface Block {
  _id: string
  hash: string
  height: number
  version: number
  merkleRoot: string
  time: number
  nonce: number
  bits: string
  difficulty: number
  chainWork: string
  previousBlockHash?: string
  nextBlockHash?: string
  size: number
  strippedSize: number
  weight: number
  txCount: number
  transactions?: string[]
  createdAt: string
}

export interface Transaction {
  _id: string
  txid: string
  hash: string
  version: number
  size: number
  vsize: number
  weight: number
  locktime: number
  blockHash?: string
  blockHeight?: number
  blockTime?: number
  confirmations?: number
  time?: number
  vin: TransactionInput[]
  vout: TransactionOutput[]
  assetData?: AssetTransactionData
  fee?: number
  createdAt: string
}

export interface TransactionInput {
  txid: string
  vout: number
  scriptSig?: {
    asm: string
    hex: string
  }
  sequence: number
  address?: string
  value?: number
}

export interface TransactionOutput {
  value: number
  n: number
  scriptPubKey: {
    asm: string
    hex: string
    type: string
    addresses?: string[]
  }
  address?: string
  assetInfo?: {
    assetName: string
    amount: number
  }
}

export interface AssetTransactionData {
  type: 'new_asset' | 'reissue_asset' | 'transfer_asset'
  assetName: string
  amount?: number
  units?: number
  reissuable?: boolean
  hasIpfs?: boolean
  ipfsHash?: string
}

// ============================================
// Address Types
// ============================================

export interface Address {
  _id: string
  address: string
  balance: number
  totalReceived: number
  totalSent: number
  txCount: number
  assetBalances: AssetBalance[]
  profile?: AddressProfile
  firstSeen?: number
  lastSeen?: number
  createdAt: string
  updatedAt: string
}

export interface AssetBalance {
  assetName: string
  balance: number
}

export interface AddressProfile {
  name?: string
  bio?: string
  avatar?: string
  website?: string
  twitter?: string
  verified: boolean
}

// ============================================
// Search Types
// ============================================

export interface SearchResults {
  assets: Asset[]
  blocks: Block[]
  transactions: Transaction[]
  addresses: Address[]
  total: number
}

// ============================================
// Statistics Types
// ============================================

export interface BlockchainInfo {
  blockHeight: number
  blockHash: string
  difficulty: number
  chainWork: string
  syncProgress: number
  networkHashRate: number
  connections: number
  lastBlockTime: number
  version: string
  protocolVersion: number
  syncedAt: string
}

export interface GlobalStats {
  totalAssets: number
  totalNFTs: number
  totalFungible: number
  totalTransactions: number
  totalAddresses: number
  totalBlocks: number
  assetsWithIpfs: number
  topCreators: CreatorStat[]
  recentAssets: Asset[]
}

export interface AssetStats {
  period: '24h' | '7d' | '30d' | 'all'
  newAssets: number
  newNFTs: number
  newFungible: number
  totalTransfers: number
  activeAddresses: number
  topAssets: {
    assetName: string
    transferCount: number
    uniqueOwners: number
  }[]
}

export interface CreatorStats {
  address: string
  profile?: AddressProfile
  totalAssets: number
  nftCount: number
  fungibleCount: number
  totalTransfers: number
  firstAssetDate: string
  lastAssetDate: string
}

export interface CreatorStat {
  address: string
  assetCount: number
  profile?: AddressProfile
}

// ============================================
// Export Types
// ============================================

export interface ExportRequest {
  assetName: string
  type: 'standard' | 'provenance' | 'legal'
  options: {
    includeTransactions: boolean
    includeMedia: boolean
  }
  legalInfo?: {
    caseReference: string
    court: string
    purpose: string
  }
}

export interface ExportResponse {
  exportId: string
  status: 'pending_payment' | 'processing' | 'completed' | 'failed' | 'expired'
  payment: {
    address: string
    amount: number
    currency: 'LTC'
    amountUsd: number
    expiresAt: string
  }
  createdAt: string
}

export interface ExportStatus {
  exportId: string
  status: 'pending_payment' | 'processing' | 'completed' | 'failed' | 'expired'
  progress?: {
    current: number
    total: number
    step: string
    percentage: number
  }
  queuePosition?: number
  payment: {
    address: string
    amount: number
    currency: 'LTC'
    paid: boolean
    paidAt?: string
    txid?: string
    expiresAt: string
  }
  downloadUrl?: string
  verification?: ExportVerification
  error?: string
  createdAt: string
  updatedAt: string
}

export interface ExportVerification {
  assetName: string
  txid: string
  blockHeight: number
  blockHash: string
  ipfsHash?: string
  timestamp: string
  verified: boolean
}

// ============================================
// Filter and Sort Types
// ============================================

export interface AssetFilters {
  type?: 'fungible' | 'nft' | 'all'
  hasIpfs?: boolean
  sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc'
  search?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface ApiQueryParams extends PaginationParams {
  sort?: string
  order?: 'asc' | 'desc'
  [key: string]: any
}
