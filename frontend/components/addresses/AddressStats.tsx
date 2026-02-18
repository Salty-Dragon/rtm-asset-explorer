'use client'

import { Card } from '@/components/ui/card'
import { Package, Grid, Coins, Image as ImageIcon } from 'lucide-react'

interface AddressStatsProps {
  totalTransactions: number
  masterAssets: number
  subAssets: number
  nfts: number
  fts: number
}

export function AddressStats({
  totalTransactions,
  masterAssets,
  subAssets,
  nfts,
  fts,
}: AddressStatsProps) {
  const totalAssets = masterAssets + subAssets

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Asset Transactions */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Asset Transactions</p>
            <p className="text-2xl font-bold">{totalTransactions.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Total Assets Owned */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
            <Grid className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Assets Owned</p>
            <p className="text-2xl font-bold">{totalAssets.toLocaleString()}</p>
            <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
              <span>{masterAssets} Master</span>
              <span>•</span>
              <span>{subAssets} Sub</span>
            </div>
          </div>
        </div>
      </Card>

      {/* NFTs */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
            <ImageIcon className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">NFTs</p>
            <p className="text-2xl font-bold">{nfts.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Fungible Tokens */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
            <Coins className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fungible Tokens</p>
            <p className="text-2xl font-bold">{fts.toLocaleString()}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
