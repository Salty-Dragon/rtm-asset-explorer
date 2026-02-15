'use client'

import { useAssetSubAssets } from '@/hooks/useApi'
import { AssetCard } from './AssetCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'

interface SubAssetGridProps {
  parentAssetId: string
  className?: string
}

export function SubAssetGrid({ parentAssetId, className }: SubAssetGridProps) {
  const { data, isLoading, error } = useAssetSubAssets(parentAssetId)

  // Don't show anything if loading or error
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Sub-Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data?.data || !Array.isArray(data.data) || data.data.length === 0) {
    return null // Don't show the section if no sub-assets
  }

  const subAssets = data.data

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          Sub-Assets ({subAssets.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subAssets.map((asset) => (
            <AssetCard key={asset._id} asset={asset} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
