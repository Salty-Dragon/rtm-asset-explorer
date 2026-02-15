'use client'

import { useGlobalStats, useBlockchainInfo } from '@/hooks/useApi'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { formatNumber, formatHashRate, formatDifficulty } from '@/lib/formatters'
import {
  BarChart3,
  FileImage,
  Layers,
  Hash,
  Users,
  Activity,
  Database,
  ImageIcon,
} from 'lucide-react'

export default function StatsPage() {
  const { data: statsData, isLoading: statsLoading, error: statsError } = useGlobalStats()
  const { data: blockchainData, isLoading: blockchainLoading, error: blockchainError } = useBlockchainInfo()

  const isLoading = statsLoading || blockchainLoading
  const stats = statsData?.data
  const blockchain = blockchainData?.data

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Statistics</h1>
        <p className="text-muted-foreground">
          Overview of the Raptoreum blockchain and asset statistics
        </p>
      </div>

      {isLoading && (
        <LoadingSpinner text="Loading statistics..." />
      )}

      {(statsError || blockchainError) && !isLoading && (
        <ErrorMessage message="Failed to load statistics" />
      )}

      {!isLoading && (
        <div className="space-y-8">
          {/* Asset Stats */}
          {stats && (
            <>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Database className="h-5 w-5 text-accent" />
                Asset Statistics
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <FileImage className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Assets</p>
                        <p className="text-2xl font-bold">{formatNumber(stats.totalAssets)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <ImageIcon className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">NFTs</p>
                        <p className="text-2xl font-bold">{formatNumber(stats.totalNFTs)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <Layers className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Fungible Assets</p>
                        <p className="text-2xl font-bold">{formatNumber(stats.totalFungible)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <Hash className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Transactions</p>
                        <p className="text-2xl font-bold">{formatNumber(stats.totalTransactions)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <Users className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Addresses</p>
                        <p className="text-2xl font-bold">{formatNumber(stats.totalAddresses)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <Layers className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Blocks</p>
                        <p className="text-2xl font-bold">{formatNumber(stats.totalBlocks)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <ImageIcon className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Assets with IPFS</p>
                        <p className="text-2xl font-bold">{formatNumber(stats.assetsWithIpfs)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Blockchain Info */}
          {blockchain && (
            <>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Blockchain Info
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <Layers className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Block Height</p>
                        <p className="text-2xl font-bold">{formatNumber(blockchain.blockHeight)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <Hash className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Network Hash Rate</p>
                        <p className="text-2xl font-bold">{formatHashRate(blockchain.networkHashRate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <BarChart3 className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Difficulty</p>
                        <p className="text-2xl font-bold">{formatDifficulty(blockchain.difficulty)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-accent/10 p-3">
                        <Activity className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Connections</p>
                        <p className="text-2xl font-bold">{blockchain.connections}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
