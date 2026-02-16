'use client'

import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/shared/CopyButton'
import { TimeAgo } from '@/components/shared/TimeAgo'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { useAssetTransfers } from '@/hooks/useApi'
import { formatAddress, formatHash } from '@/lib/utils'
import { useState } from 'react'

interface AssetHistoryProps {
  assetId: string
  className?: string
}

export function AssetHistory({ assetId, className }: AssetHistoryProps) {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useAssetTransfers(assetId, { page, limit: 10 })

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <LoadingSpinner text="Loading transfer history..." />
        </CardContent>
      </Card>
    )
  }

  if (error || !data?.data) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <EmptyState title="Failed to load transfer history" />
        </CardContent>
      </Card>
    )
  }

  const transfers = Array.isArray(data.data) ? data.data : []
  const pagination = data.pagination

  if (transfers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="No transfers yet" description="This asset has not been transferred" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Transfer History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transfers Table */}
        <div className="space-y-3">
          {transfers.map((transfer) => (
            <div
              key={transfer._id}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 space-y-2">
                {/* From → To */}
                <div className="flex items-center gap-2 text-sm">
                  {transfer.from ? (
                    <Link
                      href={`/addresses/${transfer.from}`}
                      className="font-mono text-muted-foreground hover:text-accent"
                    >
                      {formatAddress(transfer.from)}
                    </Link>
                  ) : (
                    <span className="font-mono text-muted-foreground">Genesis</span>
                  )}
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Link
                    href={`/addresses/${transfer.to}`}
                    className="font-mono text-foreground hover:text-accent"
                  >
                    {formatAddress(transfer.to)}
                  </Link>
                </div>

                {/* Transaction & Time */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Link
                    href={`/transactions/${transfer.txid}`}
                    className="flex items-center gap-1 font-mono hover:text-accent"
                  >
                    <span>{formatHash(transfer.txid, 6, 6)}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span>•</span>
                  <TimeAgo timestamp={transfer.timestamp} />
                  <span>•</span>
                  <span>Block {transfer.height}</span>
                </div>
              </div>

              {/* Amount & Copy Button */}
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">
                  {transfer.amount} {transfer.assetName}
                </div>
                <CopyButton text={transfer.txid} size="sm" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={setPage}
          />
        )}
      </CardContent>
    </Card>
  )
}
