'use client'

import { Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useFiltersStore } from '@/store/filtersStore'

interface AssetFiltersProps {
  className?: string
}

export function AssetFilters({ className }: AssetFiltersProps) {
  const { type, hasIpfs, sort, setType, setHasIpfs, setSort, reset } = useFiltersStore()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Asset Type */}
        <div className="space-y-2">
          <Label>Asset Type</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {type === 'all' ? 'All Assets' : type === 'nft' ? 'NFTs Only' : 'Fungible Only'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuRadioGroup value={type || 'all'} onValueChange={(value: string) => setType(value as 'fungible' | 'nft' | 'all')}>
                <DropdownMenuRadioItem value="all">All Assets</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="nft">NFTs Only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="fungible">Fungible Only</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* IPFS Filter */}
        <div className="space-y-2">
          <Label>IPFS Data</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {hasIpfs === undefined ? 'All Assets' : hasIpfs ? 'With IPFS Only' : 'Without IPFS'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuRadioGroup
                value={hasIpfs === undefined ? 'all' : hasIpfs ? 'true' : 'false'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setHasIpfs(undefined)
                  } else {
                    setHasIpfs(value === 'true')
                  }
                }}
              >
                <DropdownMenuRadioItem value="all">All Assets</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="true">With IPFS Only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="false">Without IPFS</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <Label>Sort By</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {sort === 'newest'
                  ? 'Newest First'
                  : sort === 'oldest'
                  ? 'Oldest First'
                  : sort === 'name_asc'
                  ? 'A → Z'
                  : 'Z → A'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuRadioGroup value={sort || 'newest'} onValueChange={(value: string) => setSort(value as 'newest' | 'oldest' | 'name_asc' | 'name_desc')}>
                <DropdownMenuRadioItem value="newest">Newest First</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="name_asc">A → Z</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name_desc">Z → A</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Reset Button */}
        <Button variant="outline" onClick={reset} className="w-full">
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  )
}
