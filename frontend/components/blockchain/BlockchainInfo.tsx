'use client'

import { Activity, Layers, Hash, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBlockchainInfo } from '@/hooks/useApi'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { formatNumber, formatHashRate, formatTimeAgo } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface BlockchainInfoProps {
  className?: string
}

export function BlockchainInfo({ className }: BlockchainInfoProps) {
  const { data, isLoading, error } = useBlockchainInfo()

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <LoadingSpinner text="Loading blockchain info..." />
        </CardContent>
      </Card>
    )
  }

  if (error || !data?.data) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <ErrorMessage message="Failed to load blockchain information" />
        </CardContent>
      </Card>
    )
  }

  const info = data.data

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          Blockchain Info
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Block Height */}
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Block Height</p>
              <p className="text-lg font-semibold">{formatNumber(info.blockHeight)}</p>
            </div>
          </div>

          {/* Network Hash Rate */}
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Network Hash Rate</p>
              <p className="text-lg font-semibold">{formatHashRate(info.networkHashRate)}</p>
            </div>
          </div>

          {/* Connections */}
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Connections</p>
              <p className="text-lg font-semibold">{info.connections}</p>
            </div>
          </div>

          {/* Last Block Time */}
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Block</p>
              <p className="text-lg font-semibold">
                {formatTimeAgo(info.lastBlockTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Sync Progress */}
        {info.syncProgress !== undefined && info.syncProgress < 100 && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Sync Progress</span>
              <span className="font-medium">{info.syncProgress.toFixed(2)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${info.syncProgress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
