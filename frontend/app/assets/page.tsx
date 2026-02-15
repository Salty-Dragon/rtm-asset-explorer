'use client'

import { useState } from 'react'
import { useInfiniteAssets } from '@/hooks/useApi'
import { useFiltersStore } from '@/store/filtersStore'
import { AssetGrid } from '@/components/assets/AssetGrid'
import { AssetFilters } from '@/components/assets/AssetFilters'
import { SearchBar } from '@/components/shared/SearchBar'
import { Button } from '@/components/ui/button'
import { Filter, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AssetsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(true)
  const { type, hasIpfs, sort, search } = useFiltersStore()

  // Build query params from filters
  const queryParams = {
    type: type !== 'all' ? type : undefined,
    hasIpfs,
    sort,
    search,
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteAssets(queryParams)

  // Flatten all pages into a single array
  const assets = data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Asset Gallery</h1>
        <p className="text-muted-foreground">
          Explore all assets on the Raptoreum blockchain
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
        {data && data.pages[0]?.pagination && (
          <div className="text-sm text-muted-foreground">
            {data.pages[0].pagination.total} assets found
          </div>
        )}
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
            isLoading={isLoading || isFetchingNextPage}
            hasMore={hasNextPage}
            onLoadMore={fetchNextPage}
          />
        </div>
      </div>
    </div>
  )
}
