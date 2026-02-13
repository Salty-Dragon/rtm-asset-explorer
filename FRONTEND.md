# Frontend Documentation

## Overview

The Raptoreum Asset Explorer frontend is built with **Next.js 14+** using the App Router, **Tailwind CSS** for styling, and modern React patterns for state management. The interface provides a professional, responsive, and accessible experience for viewing blockchain data and assets.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Key Pages](#key-pages)
3. [Component Architecture](#component-architecture)
4. [Design System](#design-system)
5. [State Management](#state-management)
6. [API Integration](#api-integration)
7. [Performance Optimization](#performance-optimization)
8. [Responsive Design](#responsive-design)
9. [Accessibility](#accessibility)
10. [SEO Optimization](#seo-optimization)

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                      # Root layout
│   ├── page.tsx                        # Homepage
│   ├── globals.css                     # Global styles
│   ├── providers.tsx                   # App providers
│   │
│   ├── assets/
│   │   ├── page.tsx                    # Asset gallery
│   │   └── [assetId]/
│   │       └── page.tsx                # Asset detail
│   │
│   ├── blocks/
│   │   ├── page.tsx                    # Block list
│   │   └── [height]/
│   │       └── page.tsx                # Block detail
│   │
│   ├── transactions/
│   │   └── [txid]/
│   │       └── page.tsx                # Transaction detail
│   │
│   ├── addresses/
│   │   └── [address]/
│   │       ├── page.tsx                # Address detail
│   │       ├── transactions/
│   │       │   └── page.tsx            # Address transactions
│   │       └── assets/
│   │           └── page.tsx            # Address assets
│   │
│   ├── creators/
│   │   ├── page.tsx                    # Creator directory
│   │   └── [address]/
│   │       └── page.tsx                # Creator profile
│   │
│   ├── search/
│   │   └── page.tsx                    # Search results
│   │
│   ├── stats/
│   │   └── page.tsx                    # Statistics dashboard
│   │
│   └── api-docs/
│       └── page.tsx                    # API documentation viewer
│
├── components/
│   ├── ui/                             # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── skeleton.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── Header.tsx                  # Main header with navigation
│   │   ├── Footer.tsx                  # Footer with links
│   │   ├── Sidebar.tsx                 # Optional sidebar
│   │   └── MobileNav.tsx               # Mobile navigation
│   │
│   ├── blockchain/
│   │   ├── BlockCard.tsx               # Block display card
│   │   ├── BlockList.tsx               # List of blocks
│   │   ├── BlockchainInfo.tsx          # Blockchain stats widget
│   │   └── SyncStatus.tsx              # Sync status indicator
│   │
│   ├── assets/
│   │   ├── AssetCard.tsx               # Asset display card
│   │   ├── AssetGrid.tsx               # Grid layout for assets
│   │   ├── AssetList.tsx               # List layout for assets
│   │   ├── AssetDetail.tsx             # Detailed asset view
│   │   ├── AssetGallery.tsx            # Image gallery
│   │   ├── AssetMetadata.tsx           # Metadata display
│   │   ├── AssetAttributes.tsx         # NFT attributes
│   │   ├── AssetHistory.tsx            # Transfer history
│   │   └── AssetFilters.tsx            # Filter controls
│   │
│   ├── transactions/
│   │   ├── TransactionCard.tsx         # Transaction card
│   │   ├── TransactionList.tsx         # List of transactions
│   │   ├── TransactionDetail.tsx       # Detailed transaction view
│   │   ├── TransactionIO.tsx           # Inputs/outputs display
│   │   └── TransactionType.tsx         # Transaction type badge
│   │
│   ├── addresses/
│   │   ├── AddressCard.tsx             # Address info card
│   │   ├── AddressBalance.tsx          # Balance display
│   │   ├── AddressProfile.tsx          # User profile display
│   │   └── AddressAssets.tsx           # Asset holdings
│   │
│   ├── creators/
│   │   ├── CreatorCard.tsx             # Creator card
│   │   ├── CreatorGrid.tsx             # Creator grid
│   │   ├── CreatorProfile.tsx          # Creator profile header
│   │   └── CreatorStats.tsx            # Creator statistics
│   │
│   └── shared/
│       ├── SearchBar.tsx               # Global search
│       ├── SearchResults.tsx           # Search results dropdown
│       ├── Pagination.tsx              # Pagination controls
│       ├── LoadingSpinner.tsx          # Loading indicator
│       ├── ErrorMessage.tsx            # Error display
│       ├── CopyButton.tsx              # Copy to clipboard
│       ├── TimeAgo.tsx                 # Relative time display
│       ├── IPFSImage.tsx               # IPFS image loader
│       ├── EmptyState.tsx              # Empty state display
│       └── Stats.tsx                   # Statistics components
│
├── lib/
│   ├── api.ts                          # API client
│   ├── utils.ts                        # Utility functions
│   ├── constants.ts                    # Constants
│   ├── types.ts                        # TypeScript types
│   ├── validators.ts                   # Input validators
│   └── formatters.ts                   # Data formatters
│
├── hooks/
│   ├── useApi.ts                       # API hook wrapper
│   ├── useSearch.ts                    # Search hook
│   ├── useInfiniteScroll.ts            # Infinite scroll hook
│   ├── useDebounce.ts                  # Debounce hook
│   ├── useLocalStorage.ts              # Local storage hook
│   └── useMediaQuery.ts                # Responsive hook
│
├── store/
│   ├── index.ts                        # Store setup
│   ├── searchStore.ts                  # Search state
│   ├── themeStore.ts                   # Theme preferences
│   └── filtersStore.ts                 # Filter state
│
├── styles/
│   └── theme.ts                        # Theme configuration
│
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   ├── images/
│   └── fonts/
│
├── next.config.js                      # Next.js configuration
├── tailwind.config.js                  # Tailwind configuration
├── tsconfig.json                       # TypeScript configuration
└── package.json                        # Dependencies
```

---

## Key Pages

### Homepage (`app/page.tsx`)

**Purpose**: Landing page showcasing blockchain stats and featured assets.

**Sections**:
1. Hero section with blockchain stats
2. Featured assets carousel
3. Recent blocks ticker
4. Top creators showcase
5. Statistics overview
6. Call-to-action for API docs

**Example**:
```tsx
import { BlockchainInfo } from '@/components/blockchain/BlockchainInfo';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { BlockList } from '@/components/blockchain/BlockList';
import { CreatorGrid } from '@/components/creators/CreatorGrid';

export default async function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-16 text-center">
        <h1 className="text-5xl font-bold mb-4">
          Raptoreum Asset Explorer
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Explore blockchain data and discover unique digital assets
        </p>
        <BlockchainInfo />
      </section>

      {/* Featured Assets */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Featured Assets</h2>
        <AssetGrid featured={true} limit={12} />
      </section>

      {/* Recent Blocks */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Recent Blocks</h2>
        <BlockList limit={10} />
      </section>

      {/* Top Creators */}
      <section>
        <h2 className="text-3xl font-bold mb-6">Top Creators</h2>
        <CreatorGrid limit={8} />
      </section>
    </div>
  );
}
```

### Asset Gallery (`app/assets/page.tsx`)

**Purpose**: Browse and filter assets.

**Features**:
- Grid/list view toggle
- Filter by type, category, creator
- Sort by date, views, transfers
- Infinite scroll or pagination
- Search within results

**Example**:
```tsx
'use client';

import { useState } from 'react';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { AssetFilters } from '@/components/assets/AssetFilters';
import { SearchBar } from '@/components/shared/SearchBar';

export default function AssetsPage() {
  const [filters, setFilters] = useState({
    type: 'all',
    sort: 'created',
    order: 'desc',
    category: null,
    creator: null
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Asset Gallery</h1>
        <SearchBar placeholder="Search assets..." />
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Filters Sidebar */}
        <aside className="col-span-12 lg:col-span-3">
          <AssetFilters 
            filters={filters} 
            onChange={setFilters} 
          />
        </aside>

        {/* Assets Grid */}
        <main className="col-span-12 lg:col-span-9">
          <AssetGrid filters={filters} />
        </main>
      </div>
    </div>
  );
}
```

### Asset Detail (`app/assets/[assetId]/page.tsx`)

**Purpose**: Display detailed asset information.

**Sections**:
1. Asset image/media viewer
2. Metadata and attributes
3. Ownership information
4. Transfer history
5. Creator information
6. Related assets

**Example**:
```tsx
import { notFound } from 'next/navigation';
import { AssetDetail } from '@/components/assets/AssetDetail';
import { AssetHistory } from '@/components/assets/AssetHistory';
import { CreatorCard } from '@/components/creators/CreatorCard';
import { api } from '@/lib/api';

export async function generateMetadata({ params }) {
  const asset = await api.getAsset(params.assetId);
  
  return {
    title: `${asset.name} | Raptoreum Asset Explorer`,
    description: asset.metadata.description,
    openGraph: {
      images: [asset.metadata.imageUrl]
    }
  };
}

export default async function AssetDetailPage({ params }) {
  const asset = await api.getAsset(params.assetId);
  
  if (!asset) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-12 gap-8">
        {/* Asset Display */}
        <div className="col-span-12 lg:col-span-8">
          <AssetDetail asset={asset} />
        </div>

        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-4">
          <CreatorCard address={asset.creator} />
          <AssetHistory assetId={asset.assetId} className="mt-6" />
        </aside>
      </div>
    </div>
  );
}
```

### Block Explorer (`app/blocks/page.tsx` and `app/blocks/[height]/page.tsx`)

**Purpose**: View blockchain blocks and their contents.

**Features**:
- Real-time block updates
- Block pagination
- Transaction listing
- Miner information

### Transaction Detail (`app/transactions/[txid]/page.tsx`)

**Purpose**: Display transaction details.

**Features**:
- Input/output visualization
- Confirmation status
- Asset transfer details
- Block information

### Address Detail (`app/addresses/[address]/page.tsx`)

**Purpose**: View address information and activity.

**Features**:
- Balance display
- Transaction history
- Asset holdings
- Creator profile (if applicable)

### Creator Profile (`app/creators/[address]/page.tsx`)

**Purpose**: Showcase creator's portfolio.

**Features**:
- Creator bio and social links
- Created assets gallery
- Statistics and achievements
- Verification badge

### Search Results (`app/search/page.tsx`)

**Purpose**: Display universal search results.

**Features**:
- Categorized results (blocks, txs, addresses, assets)
- Type-ahead suggestions
- Advanced search options

---

## Component Architecture

### Base UI Components (shadcn/ui)

Using shadcn/ui provides accessible, customizable components:

```bash
# Install shadcn/ui components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add dropdown-menu
```

### Asset Card Component

**Example**:
```tsx
// components/assets/AssetCard.tsx
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Asset } from '@/lib/types';

interface AssetCardProps {
  asset: Asset;
  className?: string;
}

export function AssetCard({ asset, className }: AssetCardProps) {
  return (
    <Link href={`/assets/${asset.assetId}`}>
      <Card className={`group hover:shadow-lg transition-shadow ${className}`}>
        <CardContent className="p-0">
          {/* Asset Image */}
          <div className="relative aspect-square overflow-hidden rounded-t-lg">
            <Image
              src={asset.metadata.imageUrl}
              alt={asset.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
            />
            
            {/* Featured Badge */}
            {asset.featured && (
              <Badge className="absolute top-2 right-2">
                Featured
              </Badge>
            )}
            
            {/* Type Badge */}
            <Badge 
              variant="secondary" 
              className="absolute bottom-2 left-2"
            >
              {asset.type === 'non-fungible' ? 'NFT' : 'Fungible'}
            </Badge>
          </div>

          {/* Asset Info */}
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-1 truncate">
              {asset.name}
            </h3>
            
            <p className="text-sm text-muted-foreground truncate mb-3">
              {asset.metadata.description}
            </p>

            {/* Stats */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {asset.transferCount} transfers
              </span>
              <span className="text-muted-foreground">
                {asset.views} views
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">By</span>
            <span className="font-medium truncate">
              {asset.creator.slice(0, 8)}...{asset.creator.slice(-6)}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
```

### Asset Grid Component

**Example**:
```tsx
// components/assets/AssetGrid.tsx
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { AssetCard } from './AssetCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { api } from '@/lib/api';

interface AssetGridProps {
  filters?: Record<string, any>;
  featured?: boolean;
  limit?: number;
  creator?: string;
}

export function AssetGrid({ 
  filters = {}, 
  featured = false,
  limit = 20,
  creator 
}: AssetGridProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['assets', filters, featured, creator],
    queryFn: ({ pageParam = 1 }) => api.getAssets({
      ...filters,
      featured,
      creator,
      page: pageParam,
      limit
    }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  });

  const { ref } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: hasNextPage
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <AssetCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <EmptyState message="Failed to load assets" />;
  }

  const assets = data?.pages.flatMap(page => page.data) || [];

  if (assets.length === 0) {
    return <EmptyState message="No assets found" />;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {assets.map(asset => (
          <AssetCard key={asset.assetId} asset={asset} />
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasNextPage && (
        <div ref={ref} className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}
    </>
  );
}
```

### Search Bar Component

**Example**:
```tsx
// components/shared/SearchBar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchResults } from './SearchResults';

export function SearchBar({ placeholder = 'Search...' }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            className="pl-9"
          />
        </div>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && debouncedQuery && (
        <SearchResults 
          query={debouncedQuery} 
          onSelect={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
```

---

## Design System

### Color Palette

**Raptoreum Brand Colors**:
```typescript
// styles/theme.ts
export const colors = {
  // Primary (Raptoreum blue)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Main brand color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Accent colors
  accent: {
    gold: '#f59e0b',
    green: '#10b981',
    red: '#ef4444',
    purple: '#8b5cf6',
  },
  
  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};
```

**Tailwind Configuration**:
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
};
```

### Typography

**Font Hierarchy**:
```css
/* app/globals.css */
h1 { @apply text-4xl md:text-5xl font-bold tracking-tight; }
h2 { @apply text-3xl md:text-4xl font-bold; }
h3 { @apply text-2xl md:text-3xl font-semibold; }
h4 { @apply text-xl md:text-2xl font-semibold; }
h5 { @apply text-lg md:text-xl font-medium; }
h6 { @apply text-base md:text-lg font-medium; }

.text-body { @apply text-base leading-relaxed; }
.text-small { @apply text-sm; }
.text-tiny { @apply text-xs; }

.font-mono { @apply font-mono text-sm; }
```

### Spacing System

Following Tailwind's spacing scale (4px base unit):
- `gap-4` (16px) - Default spacing
- `gap-6` (24px) - Section spacing
- `gap-8` (32px) - Large spacing
- `py-4` (16px) - Vertical padding
- `px-4` (16px) - Horizontal padding

### Component Variants

**Button Variants**:
- `default` - Primary action
- `secondary` - Secondary action
- `outline` - Tertiary action
- `ghost` - Subtle action
- `link` - Text link style

**Badge Variants**:
- `default` - General purpose
- `secondary` - Muted
- `success` - Positive state
- `warning` - Caution state
- `destructive` - Negative state

---

## State Management

### React Query (TanStack Query)

**Server state management** for API data:

```typescript
// lib/api.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Custom hooks
export function useAsset(assetId: string) {
  return useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => api.getAsset(assetId),
    enabled: !!assetId,
  });
}

export function useAssets(filters: AssetFilters) {
  return useInfiniteQuery({
    queryKey: ['assets', filters],
    queryFn: ({ pageParam = 1 }) => 
      api.getAssets({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  });
}

export function useBlockchainInfo() {
  return useQuery({
    queryKey: ['blockchain-info'],
    queryFn: () => api.getBlockchainInfo(),
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
}
```

### Zustand

**Client state management** for UI state:

```typescript
// store/searchStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchState {
  recentSearches: string[];
  addSearch: (query: string) => void;
  clearSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],
      
      addSearch: (query) => set((state) => ({
        recentSearches: [
          query,
          ...state.recentSearches.filter(s => s !== query)
        ].slice(0, 10)
      })),
      
      clearSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'search-storage',
    }
  )
);

// store/themeStore.ts
interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// store/filtersStore.ts
interface FiltersState {
  assetFilters: AssetFilters;
  setAssetFilters: (filters: Partial<AssetFilters>) => void;
  resetAssetFilters: () => void;
}

const defaultAssetFilters: AssetFilters = {
  type: 'all',
  sort: 'created',
  order: 'desc',
  category: null,
  creator: null,
  featured: null,
};

export const useFiltersStore = create<FiltersState>((set) => ({
  assetFilters: defaultAssetFilters,
  
  setAssetFilters: (filters) => set((state) => ({
    assetFilters: { ...state.assetFilters, ...filters }
  })),
  
  resetAssetFilters: () => set({ assetFilters: defaultAssetFilters }),
}));
```

---

## API Integration

### API Client

```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://assets.raptoreum.com/api/v1';

class RaptoreumAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        next: {
          revalidate: 60, // ISR: revalidate every 60 seconds
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Request failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Blockchain methods
  async getBlockchainInfo() {
    return this.request<BlockchainInfo>('/blockchain/info');
  }

  async getBlock(height: number) {
    return this.request<Block>(`/blockchain/blocks/${height}`);
  }

  async getBlocks(params: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<Block>>(`/blockchain/blocks?${query}`);
  }

  // Asset methods
  async getAssets(params: AssetParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<Asset>>(`/assets?${query}`);
  }

  async getAsset(assetId: string, verify = false) {
    const query = verify ? '?verify=true' : '';
    return this.request<Asset>(`/assets/${assetId}${query}`);
  }

  async getAssetTransfers(assetId: string, params: PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<Transfer>>(`/assets/${assetId}/transfers?${query}`);
  }

  // Transaction methods
  async getTransaction(txid: string) {
    return this.request<Transaction>(`/transactions/${txid}`);
  }

  // Address methods
  async getAddress(address: string) {
    return this.request<Address>(`/addresses/${address}`);
  }

  async getAddressTransactions(address: string, params: PaginationParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<Transaction>>(`/addresses/${address}/transactions?${query}`);
  }

  // Search methods
  async search(query: string, params: SearchParams) {
    const searchParams = new URLSearchParams({ q: query, ...params } as any).toString();
    return this.request<SearchResults>(`/search?${searchParams}`);
  }

  async searchAssets(query: string, params: SearchParams) {
    const searchParams = new URLSearchParams({ q: query, ...params } as any).toString();
    return this.request<PaginatedResponse<Asset>>(`/search/assets?${searchParams}`);
  }

  // Statistics methods
  async getGlobalStats() {
    return this.request<GlobalStats>('/stats/global');
  }

  async getAssetStats(period = 'all') {
    return this.request<AssetStats>(`/stats/assets?period=${period}`);
  }

  async getCreatorStats(address: string) {
    return this.request<CreatorStats>(`/stats/creators/${address}`);
  }
}

export const api = new RaptoreumAPI();
```

### Server-Side Data Fetching

```tsx
// app/assets/[assetId]/page.tsx
import { api } from '@/lib/api';

// Generate static params for popular assets
export async function generateStaticParams() {
  const assets = await api.getAssets({ 
    featured: true, 
    limit: 100 
  });
  
  return assets.data.map((asset) => ({
    assetId: asset.assetId,
  }));
}

// Server Component
export default async function AssetPage({ params }) {
  const asset = await api.getAsset(params.assetId);
  
  return <AssetDetail asset={asset} />;
}
```

### Client-Side Data Fetching

```tsx
// components/assets/AssetGrid.tsx
'use client';

import { useAssets } from '@/lib/api';

export function AssetGrid({ filters }) {
  const { data, isLoading, error } = useAssets(filters);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="grid grid-cols-4 gap-6">
      {data.data.map(asset => (
        <AssetCard key={asset.assetId} asset={asset} />
      ))}
    </div>
  );
}
```

---

## Performance Optimization

### Image Optimization

```tsx
import Image from 'next/image';

// Use Next.js Image component
<Image
  src={asset.metadata.imageUrl}
  alt={asset.name}
  width={400}
  height={400}
  loading="lazy"
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
/>

// IPFS image with fallback
<IPFSImage
  hash={asset.metadata.image}
  alt={asset.name}
  fallback="/no-image.jpg"
/>
```

### Code Splitting

```tsx
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const AssetGallery = dynamic(() => import('@/components/assets/AssetGallery'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

const Chart = dynamic(() => import('@/components/stats/Chart'), {
  ssr: false,
});
```

### Infinite Scroll

```tsx
// hooks/useInfiniteScroll.ts
import { useEffect, useRef } from 'react';

export function useInfiniteScroll({ onLoadMore, hasMore, threshold = 100 }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    const current = ref.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [hasMore, onLoadMore, threshold]);

  return { ref };
}
```

### Virtual Scrolling

```tsx
// For large lists, use react-window or react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualAssetList({ assets }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          >
            <AssetCard asset={assets[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Caching Strategy

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['ipfs.io', 'gateway.pinata.cloud'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Static generation for popular pages
  experimental: {
    isrMemoryCacheSize: 0, // Disable in-memory cache (use CDN)
  },
};
```

---

## Responsive Design

### Breakpoints

```typescript
// lib/constants.ts
export const breakpoints = {
  sm: '640px',   // Small devices
  md: '768px',   // Medium devices
  lg: '1024px',  // Large devices
  xl: '1280px',  // Extra large devices
  '2xl': '1536px', // 2X large devices
};
```

### Responsive Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
  {/* Assets */}
</div>
```

### Mobile Navigation

```tsx
// components/layout/MobileNav.tsx
'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 top-16 bg-background z-50">
          <nav className="flex flex-col gap-4 p-6">
            <a href="/assets" className="text-lg">Assets</a>
            <a href="/blocks" className="text-lg">Blocks</a>
            <a href="/creators" className="text-lg">Creators</a>
            <a href="/stats" className="text-lg">Statistics</a>
            <a href="/api-docs" className="text-lg">API Docs</a>
          </nav>
        </div>
      )}
    </div>
  );
}
```

### Media Query Hook

```tsx
// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Usage
const isMobile = useMediaQuery('(max-width: 768px)');
```

---

## Accessibility

### ARIA Labels

```tsx
<button aria-label="Copy address to clipboard">
  <Copy className="h-4 w-4" />
</button>

<nav aria-label="Main navigation">
  {/* Navigation items */}
</nav>

<img src={url} alt={asset.name} aria-describedby="asset-description" />
<p id="asset-description">{asset.metadata.description}</p>
```

### Keyboard Navigation

```tsx
// Ensure all interactive elements are keyboard accessible
<Card
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  role="button"
>
  {/* Card content */}
</Card>
```

### Focus Management

```tsx
// Auto-focus search on page load
<Input
  ref={inputRef}
  autoFocus
  type="search"
  placeholder="Search..."
/>

// Focus trap in modals
import { Dialog } from '@/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Color Contrast

Ensure WCAG AA compliance:
- Normal text: 4.5:1 contrast ratio
- Large text (18pt+): 3:1 contrast ratio
- Interactive elements: visible focus indicators

### Screen Reader Support

```tsx
// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {isLoading ? 'Loading assets...' : `${assets.length} assets loaded`}
</div>

// Skip to main content
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

<main id="main-content">
  {/* Page content */}
</main>
```

---

## SEO Optimization

### Metadata

```tsx
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Raptoreum Asset Explorer',
    template: '%s | Raptoreum Asset Explorer',
  },
  description: 'Explore Raptoreum blockchain data and discover unique digital assets',
  keywords: ['Raptoreum', 'blockchain', 'NFT', 'assets', 'explorer'],
  authors: [{ name: 'Salty-Dragon' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://assets.raptoreum.com',
    siteName: 'Raptoreum Asset Explorer',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Raptoreum Asset Explorer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@raptoreum',
    creator: '@raptoreum',
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

### Dynamic Metadata

```tsx
// app/assets/[assetId]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const asset = await api.getAsset(params.assetId);

  return {
    title: asset.name,
    description: asset.metadata.description,
    openGraph: {
      title: asset.name,
      description: asset.metadata.description,
      images: [asset.metadata.imageUrl],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: asset.name,
      description: asset.metadata.description,
      images: [asset.metadata.imageUrl],
    },
  };
}
```

### Structured Data

```tsx
// components/assets/AssetStructuredData.tsx
export function AssetStructuredData({ asset }: { asset: Asset }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: asset.name,
    description: asset.metadata.description,
    image: asset.metadata.imageUrl,
    creator: {
      '@type': 'Person',
      name: asset.creator,
    },
    dateCreated: asset.createdAt,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
```

### Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { api } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://assets.raptoreum.com';

  // Get featured assets
  const assets = await api.getAssets({ featured: true, limit: 100 });

  const assetUrls = assets.data.map((asset) => ({
    url: `${baseUrl}/assets/${asset.assetId}`,
    lastModified: new Date(asset.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/assets`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blocks`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.7,
    },
    ...assetUrls,
  ];
}
```

### robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://assets.raptoreum.com/sitemap.xml',
  };
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-13
**Author**: Salty-Dragon
**Status**: Complete - Ready for Implementation
