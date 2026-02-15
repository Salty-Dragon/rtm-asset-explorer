import Link from 'next/link'
import { ArrowRight, FileImage, Layers, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BlockchainInfo } from '@/components/blockchain/BlockchainInfo'
import { SearchBar } from '@/components/shared/SearchBar'
import { formatNumber } from '@/lib/formatters'

export default async function HomePage() {
  // In a real app, these would be fetched from the API
  // For now, we'll use placeholder data since SSR would need the API to be available
  const stats = {
    totalAssets: 0,
    totalNFTs: 0,
    totalTransactions: 0,
  }

  return (
    <div className="container py-8 md:py-12">
      {/* Hero Section */}
      <section className="mx-auto max-w-4xl text-center py-12 md:py-20">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Explore Raptoreum
          <span className="block text-accent">Assets & NFTs</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          The premier blockchain explorer for Raptoreum assets. Search, discover, and
          verify asset ownership and provenance with ease.
        </p>
        
        {/* Search Bar */}
        <div className="mx-auto max-w-2xl mb-8">
          <SearchBar autoFocus />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/assets">
              <FileImage className="mr-2 h-5 w-5" />
              Browse Assets
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/stats">
              View Statistics
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="grid gap-6 md:grid-cols-3 mb-12">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-accent/10 p-3">
                <FileImage className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">
                  {stats.totalAssets > 0 ? formatNumber(stats.totalAssets) : '—'}
                </p>
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
                <p className="text-sm text-muted-foreground">NFTs</p>
                <p className="text-2xl font-bold">
                  {stats.totalNFTs > 0 ? formatNumber(stats.totalNFTs) : '—'}
                </p>
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
                <p className="text-2xl font-bold">
                  {stats.totalTransactions > 0 ? formatNumber(stats.totalTransactions) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Blockchain Info */}
      <section className="mb-12">
        <BlockchainInfo />
      </section>

      {/* Call to Action */}
      <section className="rounded-lg border bg-card p-8 md:p-12 text-center">
        <h2 className="mb-4 text-2xl font-bold">Start Exploring</h2>
        <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">
          Discover unique digital assets, verify ownership chains, and export
          professional documentation for legal and creative purposes.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild variant="default" size="lg">
            <Link href="/assets">
              Browse Asset Gallery
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/api-docs">
              API Documentation
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
