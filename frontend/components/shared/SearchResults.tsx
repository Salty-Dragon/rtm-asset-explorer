'use client'

import Link from 'next/link'
import { FileImage, Hash, User, Layers } from 'lucide-react'
import { LoadingSpinner } from './LoadingSpinner'
import { EmptyState } from './EmptyState'
import { formatAddress, groupAssetsByParent } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { SearchResults as SearchResultsType } from '@/lib/types'

interface SearchResultsProps {
  results?: SearchResultsType
  isLoading: boolean
  query: string
  onClose: () => void
}

export function SearchResults({ results, isLoading, query, onClose }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner text="Searching..." />
      </div>
    )
  }

  if (!results || results.total === 0) {
    return (
      <div className="p-8">
        <EmptyState
          title="No results found"
          description={`No results found for "${query}"`}
          className="border-none bg-transparent p-4"
        />
      </div>
    )
  }

  const { assets, transactions, addresses, blocks } = results

  return (
    <div className="divide-y">
      {/* Assets */}
      {assets && assets.length > 0 && (
        <div className="p-2">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground">
            <FileImage className="h-3 w-3" />
            Assets ({assets.length})
          </div>
          {(() => {
            const grouped = groupAssetsByParent(assets)

            return grouped.map((asset) => (
              <Link
                key={asset._id}
                href={`/assets/${asset.assetId}`}
                onClick={onClose}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-accent${asset.isSubAsset ? ' ml-4' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {asset.isSubAsset && asset.parentAssetName
                        ? `Sub-asset of ${asset.parentAssetName}`
                        : asset.type === 'nft' ? 'NFT' : 'Fungible'}
                    </div>
                  </div>
                </div>
                <Badge variant={asset.hasIpfs ? 'success' : 'secondary'} className="text-xs">
                  {asset.hasIpfs ? 'IPFS' : 'On-Chain'}
                </Badge>
              </Link>
            ))
          })()}
        </div>
      )}

      {/* Addresses */}
      {addresses && addresses.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground">
              <User className="h-3 w-3" />
              Addresses ({addresses.length})
            </div>
            {addresses.map((address) => (
              <Link
                key={address._id}
                href={`/addresses/${address.address}`}
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-mono text-sm">{formatAddress(address.address)}</div>
                  <div className="text-xs text-muted-foreground">
                    {address.assetBalances.length} assets
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Transactions */}
      {transactions && transactions.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground">
              <Hash className="h-3 w-3" />
              Transactions ({transactions.length})
            </div>
            {transactions.map((tx) => (
              <Link
                key={tx._id}
                href={`/transactions/${tx.txid}`}
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent"
              >
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-mono text-sm">{formatAddress(tx.txid)}</div>
                  {tx.assetData && (
                    <div className="text-xs text-muted-foreground">
                      {tx.assetData.assetName}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Blocks */}
      {blocks && blocks.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground">
              <Layers className="h-3 w-3" />
              Blocks ({blocks.length})
            </div>
            {blocks.map((block) => (
              <Link
                key={block._id}
                href={`/blocks/${block.height}`}
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent"
              >
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Block #{block.height}</div>
                  <div className="text-xs text-muted-foreground">
                    {block.txCount} transactions
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* View all results link */}
      <div className="p-2">
        <Link
          href={`/search?q=${encodeURIComponent(query)}`}
          onClick={onClose}
          className="block rounded-md bg-accent px-4 py-2 text-center text-sm font-medium hover:bg-accent/80"
        >
          View all results ({results.total})
        </Link>
      </div>
    </div>
  )
}
