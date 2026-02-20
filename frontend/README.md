# Raptoreum Asset Explorer - Frontend

A modern, professional Next.js frontend for exploring Raptoreum blockchain assets, NFTs, and transactions.

## Features

- 🎨 **Dark Theme**: Pure black background with Raptoreum signature red-orange accent
- 🔍 **Smart Universal Search**: Auto-detects search type (assets, addresses, transactions, blocks, IPFS hashes)
- 📦 **Asset Gallery**: Browse, filter, and search all Raptoreum assets with infinite scroll
- 🖼️ **NFT Support**: Display NFT metadata, attributes, and IPFS images with fallback
- 📊 **Asset Details**: Complete asset information with transfer history and sub-assets
- 📄 **Export System**: Request professional asset documentation (standard, provenance, legal)
- 🌐 **IPFS Integration**: Smart IPFS image loading with multiple gateway fallbacks
- 📱 **Responsive Design**: Mobile-first design with optimized layouts for all screen sizes
- ⚡ **Performance**: Optimized with React Query caching, ISR, and code splitting

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand (filters, search history)
- **Data Fetching**: TanStack Query (React Query)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **QR Codes**: qrcode.react
- **Date Formatting**: date-fns

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Homepage
│   ├── assets/            # Asset gallery and detail pages
│   ├── search/            # Universal search results
│   └── export/            # Export status tracking
├── components/
│   ├── ui/                # shadcn/ui base components
│   ├── layout/            # Header, Footer, MobileNav
│   ├── shared/            # Reusable components (SearchBar, Pagination, etc.)
│   ├── assets/            # Asset-specific components
│   ├── blockchain/        # Blockchain info widgets
│   └── export/            # Export system components
├── lib/
│   ├── api.ts             # API client class
│   ├── types.ts           # TypeScript type definitions
│   ├── utils.ts           # Utility functions
│   ├── formatters.ts      # Data formatting functions
│   ├── validators.ts      # Input validation
│   └── constants.ts       # App constants
├── hooks/
│   ├── useApi.ts          # React Query hooks for API calls
│   ├── useSearch.ts       # Search hook with debounce
│   └── ...                # Other custom hooks
├── store/
│   ├── searchStore.ts     # Recent searches (persisted)
│   └── filtersStore.ts    # Asset filter state
└── public/                # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` (or `.env.local`) and configure:

```env
NEXT_PUBLIC_API_URL=https://assets.raptoreum.com/api/v1
NEXT_PUBLIC_IPFS_GATEWAY_URL=https://assets.raptoreum.com/ipfs
NEXT_PUBLIC_IPFS_FALLBACK_URL=https://ipfs.io/ipfs
NEXT_PUBLIC_SITE_URL=https://assets.raptoreum.com
PORT=3000  # Change this to run on a different port (e.g., PORT=3003)

# Logo Configuration (optional)
NEXT_PUBLIC_LOGO_PATH=rtm-logo.webp  # Path relative to /public directory
NEXT_PUBLIC_LOGO_WIDTH=32             # Logo width in pixels
NEXT_PUBLIC_LOGO_HEIGHT=32            # Logo height in pixels
NEXT_PUBLIC_LOGO_ALT=Raptoreum Logo   # Alt text for accessibility
```

**Logo Configuration Notes:**
- The logo file must be placed in the `/public` directory
- Supported formats: `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`
- Recommended size: 32x32 to 64x64 pixels for optimal display in the header
- To change the logo, simply update `NEXT_PUBLIC_LOGO_PATH` to point to your new logo file

### Development

```bash
npm run dev
```

The development server will start on the port specified in your `.env` file (default: [http://localhost:3000](http://localhost:3000)).

### Build

```bash
npm run build
npm run start
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Key Features

### Smart Universal Search

The search bar automatically detects what you're searching for:
- **IPFS Hash/CID**: `Qm...` or `bafy...` → searches assets by IPFS hash
- **Asset Name**: text string → searches assets by name
- **Asset ID/TX Hash**: 64-char hex → looks up asset or transaction
- **Address**: starts with `R`, 34 chars → looks up address
- **Block Height**: numeric → looks up block

### Asset Filters

- **Asset Type**: All, NFTs Only, Fungible Only
- **IPFS Data**: All, With IPFS Only, Without IPFS
- **Sort**: Newest First, Oldest First, A→Z, Z→A

### IPFS Image Loading

Smart IPFS image component with:
1. Primary gateway: `assets.raptoreum.com/ipfs`
2. Fallback to public gateways (ipfs.io, pinata, cloudflare)
3. Placeholder on complete failure
4. Skeleton loading states

### Export System

Request professional asset documentation:
- **Standard**: Basic asset info and transaction history
- **Provenance**: Complete ownership chain with verification
- **Legal**: Court-ready documentation with case information

Payment via RTM (Raptoreum).

## Design System

### Colors

- **Background**: `#000000` (pure black)
- **Accent**: `#b45a46` (Raptoreum signature red-orange)
- **Hover**: `#c76b57` (lighter accent)
- **Foreground**: `#ffffff` (white)
- **Muted**: `#a0a0a0`
- **Borders**: `#2a2a2a`
- **Status**:
  - Success: `#10b981`
  - Warning: `#f59e0b`
  - Error: `#ef4444`
  - Info: `#3b82f6`

### Fonts

- **Sans**: Inter (primary), system-ui fallback
- **Mono**: JetBrains Mono (for hashes, addresses, code)

### Responsive Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## API Integration

The frontend communicates with the Raptoreum Asset Explorer backend API:

- Base URL: `https://assets.raptoreum.com/api/v1`
- All endpoints return JSON with consistent response format
- React Query handles caching, retries, and refetching
- Stale time: 1 minute
- Cache time: 5 minutes

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management in modals
- WCAG AA color contrast
- Screen reader support

## Performance Optimizations

- Skeleton loading states
- Image optimization with Next.js Image
- Dynamic imports for heavy components
- Infinite scroll with intersection observer
- React Query caching and request deduplication

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

This is a community project for the Raptoreum ecosystem. Contributions are welcome!

## License

Built with ❤️ for the Raptoreum community.
