'use client'

import Link from 'next/link'
import { FileImage, Eye, ArrowRightLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IPFSImage } from '@/components/shared/IPFSImage'
import { formatAddress } from '@/lib/utils'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Asset } from '@/lib/types'

interface AssetCardProps {
  asset: Asset
  className?: string
}

export function AssetCard({ asset, className }: AssetCardProps) {
  return (
    <Link href={`/assets/${asset.assetId}`}>
      <Card
        className={cn(
          'group overflow-hidden transition-all hover:border-accent hover:shadow-lg',
          className
        )}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {asset.hasIpfs && asset.ipfsHash ? (
            <IPFSImage
              cid={asset.ipfsHash}
              alt={asset.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileImage className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {/* Type Badge */}
          <div className="absolute left-2 top-2">
            <Badge variant={asset.type === 'nft' ? 'default' : 'secondary'}>
              {asset.type === 'nft' ? 'NFT' : 'Fungible'}
            </Badge>
          </div>

          {/* IPFS Badge */}
          {asset.hasIpfs && (
            <div className="absolute right-2 top-2">
              <Badge variant="success" className="text-xs">
                IPFS
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Asset Name */}
          <h3 className="mb-2 truncate font-semibold group-hover:text-accent">
            {asset.name}
          </h3>

          {/* Description */}
          {asset.metadata?.description && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
              {asset.metadata.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" />
              <span>{formatNumber(asset.transferCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{formatNumber(asset.views)}</span>
            </div>
          </div>

          {/* Creator */}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Creator</span>
              <span className="font-mono">{formatAddress(asset.owner, 4, 4)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
