'use client'

import Link from 'next/link'
import { FileImage, Layers, Calendar, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { IPFSImage } from '@/components/shared/IPFSImage'
import { CopyButton } from '@/components/shared/CopyButton'
import { AssetAttributes } from './AssetAttributes'
import { AssetHistory } from './AssetHistory'
import { SubAssetGrid } from './SubAssetGrid'
import { formatDate, formatNumber } from '@/lib/formatters'
import { formatHash } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { detectFileType } from '@/lib/fileTypes'
import type { Asset } from '@/lib/types'

interface AssetDetailProps {
  asset: Asset
  onExport?: () => void
  className?: string
}

export function AssetDetail({ asset, onExport, className }: AssetDetailProps) {
  // Detect file type from IPFS hash if available
  const fileType = asset.hasIpfs && asset.ipfsHash 
    ? detectFileType(asset.ipfsHash)
    : null

  return (
    <div className={cn('grid gap-6 lg:grid-cols-12', className)}>
      {/* Main Content - Left Column */}
      <div className="space-y-6 lg:col-span-8">
        {/* Image */}
        <Card>
          <CardContent className="p-0">
            <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
              {asset.hasIpfs && asset.ipfsHash ? (
                <IPFSImage
                  cid={asset.ipfsHash}
                  alt={asset.name}
                  fill
                  priority
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <FileImage className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Name and Description */}
        <div>
          <div className="mb-2 flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">{asset.name}</h1>
            <div className="flex gap-2">
              <Badge variant={asset.type === 'nft' ? 'default' : 'secondary'}>
                {asset.type === 'nft' ? 'NFT' : 'Fungible'}
              </Badge>
              {/* File Type Badge */}
              {fileType?.badge && (
                <Badge variant="outline">
                  {fileType.badge}
                </Badge>
              )}
            </div>
          </div>
          {asset.metadata?.description && (
            <p className="text-muted-foreground">{asset.metadata.description}</p>
          )}
        </div>

        {/* Attributes */}
        {asset.metadata?.attributes && Array.isArray(asset.metadata.attributes) && asset.metadata.attributes.length > 0 && (
          <AssetAttributes attributes={asset.metadata.attributes} />
        )}

        {/* Transfer History */}
        <AssetHistory assetId={asset.assetId} />

        {/* Sub-Assets */}
        {!asset.isSubAsset && <SubAssetGrid parentAssetId={asset.assetId} />}
      </div>

      {/* Sidebar - Right Column */}
      <div className="space-y-6 lg:col-span-4">
        {/* Asset Info Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Asset Information</h3>

            <Separator />

            {/* Asset ID */}
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Asset ID</div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm break-all">{asset.assetId}</span>
                <CopyButton text={asset.assetId} size="sm" />
              </div>
            </div>

            {/* Creator */}
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Creator</div>
              <div className="flex items-center justify-between gap-2">
                {asset.owner ? (
                  <>
                    <Link
                      href={`/addresses/${asset.owner}`}
                      className="font-mono text-sm hover:text-accent break-all"
                    >
                      {asset.owner}
                    </Link>
                    <CopyButton text={asset.owner} size="sm" />
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Unknown</span>
                )}
              </div>
            </div>

            {/* Created Date */}
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Created</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(asset.createdAt)}</span>
              </div>
            </div>

            {/* Block Height */}
            {asset.height != null && (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Block Height</div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={`/blocks/${asset.height}`}
                    className="text-sm hover:text-accent"
                  >
                    {formatNumber(asset.height)}
                  </Link>
                </div>
              </div>
            )}

            {/* Supply */}
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Total Supply</div>
              <div className="text-sm">{formatNumber(asset.amount)}</div>
            </div>

            {/* Units */}
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Units</div>
              <div className="text-sm">{asset.units}</div>
            </div>

            {/* Reissuable */}
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Reissuable</div>
              <Badge variant={asset.reissuable ? 'success' : 'secondary'}>
                {asset.reissuable ? 'Yes' : 'No'}
              </Badge>
            </div>

            {/* IPFS Hash */}
            {asset.ipfsHash && (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">IPFS Hash</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm break-all">{formatHash(asset.ipfsHash)}</span>
                  <CopyButton text={asset.ipfsHash} size="sm" />
                </div>
              </div>
            )}

            {/* Stats */}
            <Separator />

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{formatNumber(asset.transferCount)}</div>
                <div className="text-xs text-muted-foreground">Transfers</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{formatNumber(asset.views)}</div>
                <div className="text-xs text-muted-foreground">Views</div>
              </div>
            </div>

            {/* Export Button */}
            {onExport && (
              <>
                <Separator />
                <Button onClick={onExport} className="w-full" size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Export Asset
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
