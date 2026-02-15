'use client'

import { useState } from 'react'
import { useBlocks } from '@/hooks/useApi'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Pagination } from '@/components/shared/Pagination'
import { formatNumber, formatTimeAgo } from '@/lib/formatters'
import { Layers, Clock, Hash } from 'lucide-react'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { Block } from '@/lib/types'

export default function BlocksPage() {
  const [page, setPage] = useState(1)
  const limit = DEFAULT_PAGE_SIZE
  const offset = (page - 1) * limit

  const { data, isLoading, error } = useBlocks({ limit, offset })

  const blocks = data?.data ?? []
  const total = data?.pagination?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Blocks</h1>
        <p className="text-muted-foreground">
          Browse recent blocks on the Raptoreum blockchain
        </p>
      </div>

      {isLoading && (
        <LoadingSpinner text="Loading blocks..." />
      )}

      {error && (
        <ErrorMessage message="Failed to load blocks" />
      )}

      {!isLoading && !error && (
        <>
          {blocks.length > 0 ? (
            <div className="space-y-4">
              {blocks.map((block: Block) => (
                <Card key={block.height ?? block._id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-accent/10 p-2">
                          <Layers className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            Block #{formatNumber(block.height)}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono truncate max-w-xs">
                            {block.hash}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {block.txCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-4 w-4" />
                            {block.txCount} txs
                          </span>
                        )}
                        {block.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTimeAgo(block.time)}
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
                No blocks found
              </CardContent>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
