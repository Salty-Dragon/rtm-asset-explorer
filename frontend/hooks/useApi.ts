// React Query hooks for API endpoints

'use client'

import { useQuery, useInfiniteQuery, useMutation, UseQueryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { STALE_TIME, CACHE_TIME } from '@/lib/constants'
import type {
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
  ApiQueryParams,
} from '@/lib/types'

// ============================================
// Blockchain Hooks
// ============================================

export function useBlockchainInfo() {
  return useQuery({
    queryKey: ['blockchain', 'info'],
    queryFn: () => api.getBlockchainInfo(),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

export function useBlocks(params?: ApiQueryParams) {
  return useQuery({
    queryKey: ['blocks', params],
    queryFn: () => api.getBlocks(params),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

export function useBlock(heightOrHash: string | number) {
  return useQuery({
    queryKey: ['block', heightOrHash],
    queryFn: () => api.getBlock(heightOrHash),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!heightOrHash,
  })
}

// ============================================
// Asset Hooks
// ============================================

export function useAssets(params?: ApiQueryParams) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: () => api.getAssets(params),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

export function useInfiniteAssets(params?: ApiQueryParams) {
  const limit = params?.limit ?? 20
  return useInfiniteQuery({
    queryKey: ['assets', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => api.getAssets({ ...params, offset: (pageParam - 1) * limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination && lastPage.pagination.hasNext) {
        return lastPage.pagination.page + 1
      }
      return undefined
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

export function useAsset(assetId: string) {
  return useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => api.getAsset(assetId),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!assetId,
  })
}

export function useAssetTransfers(assetId: string, params?: ApiQueryParams) {
  return useQuery({
    queryKey: ['asset', assetId, 'transfers', params],
    queryFn: () => api.getAssetTransfers(assetId, params),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!assetId,
  })
}

export function useAssetSubAssets(assetId: string) {
  return useQuery({
    queryKey: ['asset', assetId, 'subassets'],
    queryFn: () => api.getAssetSubAssets(assetId),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!assetId,
  })
}

// ============================================
// Transaction Hooks
// ============================================

export function useTransaction(txid: string) {
  return useQuery({
    queryKey: ['transaction', txid],
    queryFn: () => api.getTransaction(txid),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!txid,
  })
}

export function useTransactions(params?: ApiQueryParams) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.getTransactions(params),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

// ============================================
// Address Hooks
// ============================================

export function useAddress(address: string) {
  return useQuery({
    queryKey: ['address', address],
    queryFn: () => api.getAddress(address),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!address,
  })
}

export function useAddressTransactions(address: string, params?: ApiQueryParams) {
  return useQuery({
    queryKey: ['address', address, 'transactions', params],
    queryFn: () => api.getAddressTransactions(address, params),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!address,
  })
}

export function useAddressAssets(address: string, params?: ApiQueryParams) {
  return useQuery({
    queryKey: ['address', address, 'assets', params],
    queryFn: () => api.getAddressAssets(address, params),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!address,
  })
}

// ============================================
// Search Hooks
// ============================================

export function useSearch(query: string, params?: ApiQueryParams) {
  return useQuery({
    queryKey: ['search', query, params],
    queryFn: () => api.search(query, params),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!query && query.length >= 2,
  })
}

export function useSearchAssets(query: string, params?: ApiQueryParams) {
  return useQuery({
    queryKey: ['search', 'assets', query, params],
    queryFn: () => api.searchAssets(query, params),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!query && query.length >= 2,
  })
}

// ============================================
// Statistics Hooks
// ============================================

export function useGlobalStats() {
  return useQuery({
    queryKey: ['stats', 'global'],
    queryFn: () => api.getGlobalStats(),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

export function useAssetStats(period: '24h' | '7d' | '30d' | 'all' = '24h') {
  return useQuery({
    queryKey: ['stats', 'assets', period],
    queryFn: () => api.getAssetStats(period),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

export function useCreatorStats(address: string) {
  return useQuery({
    queryKey: ['stats', 'creator', address],
    queryFn: () => api.getCreatorStats(address),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!address,
  })
}

export function useTopCreators(limit = 10) {
  return useQuery({
    queryKey: ['stats', 'creators', 'top', limit],
    queryFn: () => api.getTopCreators(limit),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

// ============================================
// Export Hooks
// ============================================

export function useRequestExport() {
  return useMutation({
    mutationFn: (data: ExportRequest) => api.requestExport(data),
  })
}

export function useExportStatus(exportId: string, enabled = true) {
  return useQuery({
    queryKey: ['export', 'status', exportId],
    queryFn: () => api.getExportStatus(exportId),
    staleTime: 0, // Always fetch fresh data
    gcTime: CACHE_TIME,
    enabled: !!exportId && enabled,
    refetchInterval: 10000, // Poll every 10 seconds
  })
}

export function useVerifyExport(assetName: string) {
  return useQuery({
    queryKey: ['export', 'verify', assetName],
    queryFn: () => api.verifyExport(assetName),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!assetName,
  })
}
