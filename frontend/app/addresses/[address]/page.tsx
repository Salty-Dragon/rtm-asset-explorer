'use client'

import { useState, use } from 'react'
import { useAddress, useAddressAssets } from '@/hooks/useApi'
import { AddressStats } from '@/components/addresses/AddressStats'
import { AssetGrid } from '@/components/assets/AssetGrid'
import { AssetFilters } from '@/components/assets/AssetFilters'
import { SearchBar } from '@/components/shared/SearchBar'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { CopyButton } from '@/components/shared/CopyButton'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Filter, LayoutGrid, List } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useFiltersStore } from '@/store/filtersStore'

export default function AddressDetailPage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = use(params)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const { type, search } = useFiltersStore()

  // Fetch address details
  const { data: addressData, isLoading: isLoadingAddress, error: addressError } = useAddress(address)

  // Build query params from filters
  const queryParams = {
    type: type !== 'all' ? type : undefined,
    search,
  }

  // Fetch assets for this address
  const {
    data: assetsData,
    isLoading: isLoadingAssets,
  } = useAddressAssets(address, queryParams)

  const assets = assetsData?.data ?? []

  // Loading state
  if (isLoadingAddress) {
    return (
      <div className="container py-12">
        <LoadingSpinner text="Loading address..." />
      </div>
    )
  }

  // Error state
  if (addressError || !addressData?.data) {
    return (
      <div className="container py-12">
        <div className="mb-4">
          <Button asChild variant="ghost">
            <Link href="/assets">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Assets
            </Link>
          </Button>
        </div>
        <ErrorMessage
          title="Address Not Found"
          message="The address you're looking for doesn't exist or has no activity."
        />
      </div>
    )
  }

  const addressInfo = addressData.data

  // Calculate statistics from assets in a single pass
  const stats = assets.reduce(
    (acc, asset) => {
      if (!asset.isSubAsset) acc.masterAssets++
      else acc.subAssets++
      
      if (asset.type === 'nft') acc.nfts++
      else if (asset.type === 'fungible') acc.fts++
      
      return acc
    },
    { masterAssets: 0, subAssets: 0, nfts: 0, fts: 0 }
  )

  const assetCountText = `${assets.length} ${assets.length === 1 ? 'asset' : 'assets'}`

  return (
    <div className="container py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button asChild variant="ghost">
          <Link href="/assets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Link>
        </Button>
      </div>

      {/* Address Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Address</h1>
        <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
          <code className="flex-1 break-all text-sm">{address}</code>
          <CopyButton text={address} />
        </div>
      </div>

      {/* Statistics Cards */}
      <AddressStats
        totalTransactions={addressInfo.txCount || 0}
        masterAssets={stats.masterAssets}
        subAssets={stats.subAssets}
        nfts={stats.nfts}
        fts={stats.fts}
      />

      {/* Section Header */}
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold">Assets</h2>
        <p className="text-muted-foreground">
          {assetCountText} owned by this address
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar placeholder="Search assets by name, ID, or IPFS hash..." />
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Toggle (Mobile) */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden"
        >
          <Filter className="mr-2 h-4 w-4" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {assetCountText} found
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Filters Sidebar */}
        <aside
          className={cn(
            'lg:col-span-3',
            showFilters ? 'block' : 'hidden lg:block'
          )}
        >
          <AssetFilters />
        </aside>

        {/* Assets Grid */}
        <div className="lg:col-span-9">
          <AssetGrid
            assets={assets}
            isLoading={isLoadingAssets}
            hasMore={false}
          />
        </div>
      </div>
    </div>
  )
}
