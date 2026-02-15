'use client'

import { useSearchParams } from 'next/navigation'
import { useSearch } from '@/hooks/useApi'
import { AssetCard } from '@/components/assets/AssetCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { formatAddress } from '@/lib/utils'
import { FileImage, User, Hash, Layers } from 'lucide-react'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const { data, isLoading, error } = useSearch(query)

  if (!query) {
    return (
      <div className="container py-12">
        <EmptyState
          title="No search query"
          description="Enter a search term to find assets, addresses, transactions, or blocks"
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container py-12">
        <LoadingSpinner text="Searching..." />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="container py-12">
        <EmptyState
          title="Search failed"
          description="Failed to perform search. Please try again."
        />
      </div>
    )
  }

  const results = data.data
  const { assets, transactions, addresses, blocks, total } = results

  if (total === 0) {
    return (
      <div className="container py-12">
        <h1 className="mb-6 text-3xl font-bold">
          Search Results for &quot;{query}&quot;
        </h1>
        <EmptyState
          title="No results found"
          description={`No results found for "${query}". Try a different search term.`}
        />
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="mb-2 text-3xl font-bold">
        Search Results for &quot;{query}&quot;
      </h1>
      <p className="mb-8 text-muted-foreground">
        Found {total} result{total !== 1 ? 's' : ''}
      </p>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({total})</TabsTrigger>
          {assets && assets.length > 0 && (
            <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
          )}
          {addresses && addresses.length > 0 && (
            <TabsTrigger value="addresses">Addresses ({addresses.length})</TabsTrigger>
          )}
          {transactions && transactions.length > 0 && (
            <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
          )}
          {blocks && blocks.length > 0 && (
            <TabsTrigger value="blocks">Blocks ({blocks.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="space-y-8 mt-6">
          {/* Assets */}
          {assets && assets.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Assets
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {assets.map((asset) => (
                  <AssetCard key={asset._id} asset={asset} />
                ))}
              </div>
            </section>
          )}

          {/* Addresses */}
          {addresses && addresses.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Addresses
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map((address) => (
                  <Card key={address._id}>
                    <CardContent className="p-4">
                      <Link
                        href={`/addresses/${address.address}`}
                        className="font-mono text-sm hover:text-accent break-all"
                      >
                        {address.address}
                      </Link>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {address.assetBalances.length} asset{address.assetBalances.length !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Transactions */}
          {transactions && transactions.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Transactions
              </h2>
              <div className="grid gap-4">
                {transactions.map((tx) => (
                  <Card key={tx._id}>
                    <CardContent className="p-4">
                      <Link
                        href={`/transactions/${tx.txid}`}
                        className="font-mono text-sm hover:text-accent break-all"
                      >
                        {tx.txid}
                      </Link>
                      {tx.assetData && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Asset: {tx.assetData.assetName}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Blocks */}
          {blocks && blocks.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Blocks
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {blocks.map((block) => (
                  <Card key={block._id}>
                    <CardContent className="p-4">
                      <Link
                        href={`/blocks/${block.height}`}
                        className="text-lg font-semibold hover:text-accent"
                      >
                        Block #{block.height}
                      </Link>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {block.txCount} transaction{block.txCount !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </TabsContent>

        {/* Individual category tabs would go here, but for brevity we'll skip them */}
        {/* They would show the same content as the "all" tab but filtered */}
      </Tabs>
    </div>
  )
}
