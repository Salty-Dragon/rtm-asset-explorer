'use client'

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { AssetCard } from './AssetCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Asset } from '@/lib/types'

interface AssetGridProps {
  assets: Asset[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
}

export function AssetGrid({
  assets,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  className,
}: AssetGridProps) {
  const loadMoreRef = useInfiniteScroll({
    onLoadMore: onLoadMore || (() => {}),
    hasMore,
    isLoading,
  })

  if (isLoading && assets.length === 0) {
    return (
      <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <EmptyState
        title="No assets found"
        description="Try adjusting your filters or search query"
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
        {assets.map((asset) => (
          <AssetCard key={asset._id} asset={asset} />
        ))}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoading && <LoadingSpinner text="Loading more assets..." />}
        </div>
      )}
    </div>
  )
}
