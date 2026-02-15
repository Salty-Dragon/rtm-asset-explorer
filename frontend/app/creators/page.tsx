'use client'

import { useTopCreators } from '@/hooks/useApi'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { formatNumber } from '@/lib/formatters'
import { FileImage, Award } from 'lucide-react'
import type { CreatorStats } from '@/lib/types'

export default function CreatorsPage() {
  const { data, isLoading, error } = useTopCreators(50)

  const creators = data?.data ?? []

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Top Creators</h1>
        <p className="text-muted-foreground">
          Most active asset creators on the Raptoreum blockchain
        </p>
      </div>

      {isLoading && (
        <LoadingSpinner text="Loading creators..." />
      )}

      {error && !isLoading && (
        <ErrorMessage message="Failed to load creators" />
      )}

      {!isLoading && !error && (
        <>
          {creators.length > 0 ? (
            <div className="space-y-4">
              {creators.map((creator: CreatorStats, index: number) => (
                <Card key={creator.address || index}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-accent/10 p-2 min-w-[40px] text-center">
                          <span className="text-sm font-bold text-accent">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-mono text-sm truncate max-w-xs">
                            {creator.address}
                          </p>
                          {creator.profile?.name && (
                            <p className="text-sm text-muted-foreground">{creator.profile.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileImage className="h-4 w-4" />
                          {formatNumber(creator.totalAssets)} assets
                        </span>
                        {creator.nftCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            {formatNumber(creator.nftCount)} NFTs
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No creators found
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
