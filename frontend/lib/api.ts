// API client for Raptoreum Asset Explorer backend

import { API_BASE_URL } from './constants'
import type {
  ApiResponse,
  PaginatedResponse,
  Asset,
  AssetTransfer,
  Block,
  Transaction,
  Address,
  SearchResults,
  BlockchainInfo,
  GlobalStats,
  AssetStats,
  CreatorStats,
  ExportRequest,
  ExportResponse,
  ExportStatus,
  ExportVerification,
  ApiQueryParams,
} from './types'

class RaptoreumAPI {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Make a GET request
   */
  private async get<T>(endpoint: string, params?: ApiQueryParams): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  /**
   * Make a POST request
   */
  private async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // ============================================
  // Blockchain Endpoints
  // ============================================

  async getBlockchainInfo(): Promise<ApiResponse<BlockchainInfo>> {
    return this.get('/blockchain/info')
  }

  async getBlocks(params?: ApiQueryParams): Promise<PaginatedResponse<Block>> {
    return this.get('/blocks', params)
  }

  async getBlock(heightOrHash: string | number): Promise<ApiResponse<Block>> {
    return this.get(`/blocks/${heightOrHash}`)
  }

  // ============================================
  // Asset Endpoints
  // ============================================

  async getAssets(params?: ApiQueryParams): Promise<PaginatedResponse<Asset>> {
    return this.get('/assets', params)
  }

  async getAsset(assetId: string): Promise<ApiResponse<Asset>> {
    return this.get(`/assets/${assetId}`)
  }

  async getAssetTransfers(
    assetId: string,
    params?: ApiQueryParams
  ): Promise<PaginatedResponse<AssetTransfer>> {
    return this.get(`/assets/${assetId}/transfers`, params)
  }

  async getAssetSubAssets(assetId: string): Promise<ApiResponse<Asset[]>> {
    return this.get(`/assets/${assetId}/subassets`)
  }

  async getAssetsByParent(parentName: string): Promise<ApiResponse<Asset[]>> {
    return this.get(`/assets/parent/${parentName}`)
  }

  // ============================================
  // Transaction Endpoints
  // ============================================

  async getTransaction(txid: string): Promise<ApiResponse<Transaction>> {
    return this.get(`/transactions/${txid}`)
  }

  async getTransactions(params?: ApiQueryParams): Promise<PaginatedResponse<Transaction>> {
    return this.get('/transactions', params)
  }

  // ============================================
  // Address Endpoints
  // ============================================

  async getAddress(address: string): Promise<ApiResponse<Address>> {
    return this.get(`/addresses/${address}`)
  }

  async getAddressTransactions(
    address: string,
    params?: ApiQueryParams
  ): Promise<PaginatedResponse<Transaction>> {
    return this.get(`/addresses/${address}/transactions`, params)
  }

  async getAddressAssets(
    address: string,
    params?: ApiQueryParams
  ): Promise<PaginatedResponse<Asset>> {
    return this.get(`/addresses/${address}/assets`, params)
  }

  // ============================================
  // Search Endpoints
  // ============================================

  async search(query: string, params?: ApiQueryParams): Promise<ApiResponse<SearchResults>> {
    return this.get('/search', { q: query, ...params })
  }

  async searchAssets(query: string, params?: ApiQueryParams): Promise<PaginatedResponse<Asset>> {
    return this.get('/assets/search', { q: query, ...params })
  }

  // ============================================
  // Statistics Endpoints
  // ============================================

  async getGlobalStats(): Promise<ApiResponse<GlobalStats>> {
    return this.get('/stats/global')
  }

  async getAssetStats(period: '24h' | '7d' | '30d' | 'all' = '24h'): Promise<ApiResponse<AssetStats>> {
    return this.get('/stats/assets', { period })
  }

  async getCreatorStats(address: string): Promise<ApiResponse<CreatorStats>> {
    return this.get(`/stats/creators/${address}`)
  }

  async getTopCreators(limit = 10): Promise<ApiResponse<CreatorStats[]>> {
    return this.get('/stats/creators', { limit })
  }

  // ============================================
  // Export Endpoints
  // ============================================

  async requestExport(data: ExportRequest): Promise<ApiResponse<ExportResponse>> {
    return this.post('/export/request', data)
  }

  async getExportStatus(exportId: string): Promise<ApiResponse<ExportStatus>> {
    return this.get(`/export/status/${exportId}`)
  }

  async verifyExport(assetName: string): Promise<ApiResponse<ExportVerification>> {
    return this.get(`/export/verify/${assetName}`)
  }

  // ============================================
  // Health Endpoints
  // ============================================

  async getHealth(): Promise<ApiResponse<{ status: string; uptime: number }>> {
    return this.get('/health')
  }
}

// Export singleton instance
export const api = new RaptoreumAPI()

// Export class for custom instances
export default RaptoreumAPI
