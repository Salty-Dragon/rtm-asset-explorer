'use client'

import { useState } from 'react'
import { useAssetSubAssets } from '@/hooks/useApi'
import { AssetCard } from './AssetCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronUp } from 'lucide-react'

const COLLAPSED_LIMIT = 5

interface SubAssetGridProps {
  parentAssetId: string
  className?: string
}

export function SubAssetGrid({ parentAssetId, className }: SubAssetGridProps) {
  const { data, isLoading, error } = useAssetSubAssets(parentAssetId)
  const [expanded, setExpanded] = useState(false)

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
  const isCollapsible = subAssets.length > COLLAPSED_LIMIT
  const visibleAssets = isCollapsible && !expanded
    ? subAssets.slice(0, COLLAPSED_LIMIT)
    : subAssets

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          Sub-Assets ({subAssets.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAssets.map((asset) => (
            <AssetCard key={asset._id} asset={asset} />
          ))}
        </div>
        {isCollapsible && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show All ({subAssets.length})
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
