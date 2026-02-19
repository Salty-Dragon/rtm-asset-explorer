# Development Guide

## Overview

This guide covers local development setup, workflow, and best practices for contributing to the Raptoreum Asset Explorer project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Running Services Locally](#running-services-locally)
5. [Development Workflow](#development-workflow)
6. [Code Style Guidelines](#code-style-guidelines)
7. [Testing Strategy](#testing-strategy)
8. [Git Workflow](#git-workflow)
9. [Contributing Guidelines](#contributing-guidelines)
10. [Export System Development](#export-system-development)
11. [Common Development Tasks](#common-development-tasks)

---

## Prerequisites

### Required Software

- **Node.js 24 LTS**: JavaScript runtime
- **MongoDB 8.x**: Database
- **Redis 8.x**: Caching and rate limiting
- **Git**: Version control
- **Code Editor**: VS Code (recommended)

### Optional Software

- **Raptoreumd**: For full blockchain integration (can use testnet or mock data for development)
- **IPFS**: For metadata storage (can use public gateways during development)
- **Docker**: For containerized development (optional alternative)
- **Litecoin Core**: Pruned node for payment processing
  ```bash
  # Install Litecoin Core
  wget https://download.litecoin.org/litecoin-0.21.3/linux/litecoin-0.21.3-x86_64-linux-gnu.tar.gz
  tar -xzf litecoin-0.21.3-x86_64-linux-gnu.tar.gz
  sudo install -m 0755 -o root -g root -t /usr/local/bin litecoin-0.21.3/bin/*
  
  # Configure pruned node
  mkdir -p ~/.litecoin
  cat > ~/.litecoin/litecoin.conf << EOF
  prune=550
  server=1
  rpcuser=ltc_user
  rpcpassword=secure_password
  rpcallowip=127.0.0.1
  rpcport=9332
  EOF
  
  # Start node
  litecoind -daemon
  ```

### System Requirements

- **OS**: macOS, Linux, or Windows with WSL2
- **RAM**: 8 GB minimum (16 GB recommended)
- **Storage**: 50 GB free space (for blockchain data if using local node)

---

## Local Development Setup

### 1. Install Node.js

**Using NVM (Recommended)**:
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc  # or ~/.zshrc on macOS

# Install Node.js 24 LTS
nvm install 24
nvm use 24
nvm alias default 24

# Verify installation
node --version  # Should be v24.x.x
npm --version
```

**Or download from**:
https://nodejs.org/en/download/

### 2. Install MongoDB

**macOS (using Homebrew)**:
```bash
brew tap mongodb/brew
brew install mongodb-community@8.0
brew services start mongodb-community@8.0
```

**Ubuntu/Debian**:
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-8.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Windows**:
Download from https://www.mongodb.com/try/download/community

### 3. Install Redis

**macOS (using Homebrew)**:
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian**:
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Windows**:
Use WSL2 or download from https://github.com/microsoftarchive/redis/releases

### 4. Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/rtm-asset-explorer.git
cd rtm-asset-explorer

# Install dependencies
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Install Development Tools

```bash
# ESLint and Prettier
npm install -g eslint prettier

# TypeScript
npm install -g typescript

# Nodemon (for auto-restart during development)
npm install -g nodemon

# PM2 (optional for local development)
npm install -g pm2
```

### 6. VS Code Setup (Recommended)

Install recommended extensions:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "mongodb.mongodb-vscode",
    "ms-vscode.vscode-typescript-next",
    "christian-kohler.path-intellisense"
  ]
}
```

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

---

## Environment Configuration

### 1. Backend Environment

Create `backend/.env.development`:
```bash
NODE_ENV=development

# Server
PORT=4004
HOST=localhost

# Database
MONGODB_URI=mongodb://localhost:27017/rtm_explorer_dev
MONGODB_OPTIONS={"useNewUrlParser":true,"useUnifiedTopology":true}

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Blockchain RPC (optional - use mock data if not available)
RPC_HOST=localhost
RPC_PORT=10225
RPC_USER=rtm_dev
RPC_PASSWORD=dev_password
RPC_TIMEOUT=30000
USE_MOCK_BLOCKCHAIN=true  # Set to false if using real node

# IPFS (optional - use public gateway if not available)
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
IPFS_TIMEOUT=30000
USE_PUBLIC_IPFS_GATEWAY=true

# API
API_SECRET=dev_secret_key_change_in_production
API_BASE_URL=http://localhost:4004/api/v1

# Rate Limiting (relaxed for development)
RATE_LIMIT_FREE=1000
RATE_LIMIT_PREMIUM=10000
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=debug
LOG_DIR=./logs

# Development
ENABLE_DEBUG=true
ENABLE_MOCK_DATA=true
```

### 2. Frontend Environment

Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4004/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
NEXT_TELEMETRY_DISABLED=1
```

### 3. Production Environment Variables

For production deployment, use the comprehensive `.env.example` files as templates:

#### Backend Configuration

Copy the example file and customize:
```bash
cp backend/.env.example backend/.env
```

**Critical variables to change:**
- `APP_URL` - Your domain (e.g., https://assets.raptoreum.com)
- `MONGODB_URI` - Include your MongoDB credentials with authentication
- `REDIS_PASSWORD` - Set a strong Redis password
- `RAPTOREUMD_PASSWORD` - Your local node RPC password
- `HOT_WALLET_SHARED_SECRET` - Shared secret for hot wallet API authentication
- `LITECOIN_RPC_PASSWORD` - Litecoin node credentials
- `SESSION_SECRET` - Generate with: `openssl rand -hex 32`
- `JWT_SECRET` - Generate with: `openssl rand -hex 32`
- `EXPORT_SIGNING_*_KEY` - Paths to your RSA keys
- `CORS_ORIGIN` - Set to your production domain

**Generate secure secrets:**
```bash
# Generate session secret
openssl rand -hex 32

# Generate JWT secret
openssl rand -hex 32

# Generate RSA keys for export signing
mkdir -p backend/keys
openssl genrsa -out backend/keys/private_key.pem 4096
openssl rsa -in backend/keys/private_key.pem -pubout -out backend/keys/public_key.pem
chmod 600 backend/keys/private_key.pem
```

#### Frontend Configuration

```bash
cp frontend/.env.example frontend/.env.local
```

**Critical variables:**
- `NEXT_PUBLIC_APP_URL` - Your domain
- `NEXT_PUBLIC_API_URL` - API endpoint (usually {domain}/api)

### 4. Initialize Database

```bash
# Run database setup script
cd backend
npm run db:setup

# Or manually create indexes
mongosh rtm_explorer_dev < scripts/create-indexes.js
```

Create `backend/scripts/create-indexes.js`:
```javascript
// Create all indexes as defined in DATABASE.md
// Blocks
db.blocks.createIndex({ height: -1 }, { unique: true });
db.blocks.createIndex({ hash: 1 }, { unique: true });
db.blocks.createIndex({ timestamp: -1 });

// Transactions
db.transactions.createIndex({ txid: 1 }, { unique: true });
db.transactions.createIndex({ blockHeight: -1 });
db.transactions.createIndex({ timestamp: -1 });

// Assets
db.assets.createIndex({ assetId: 1 }, { unique: true });
db.assets.createIndex({ name: 1 });
db.assets.createIndex({ creator: 1, createdAt: -1 });
db.assets.createIndex(
  { 
    name: 'text', 
    'metadata.name': 'text', 
    'metadata.description': 'text' 
  },
  { name: 'asset_text_search' }
);

// Add more indexes as needed...
print('Indexes created successfully');
```

### 5. Seed Development Data (Optional)

```bash
# Run seed script
cd backend
npm run db:seed
```

Create `backend/scripts/seed-data.js`:
```javascript
// seed-data.js - Populate database with sample data
const mongoose = require('mongoose');
const { Asset, Block, Transaction } = require('../src/models');

async function seedData() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Clear existing data
  await Asset.deleteMany({});
  await Block.deleteMany({});
  await Transaction.deleteMany({});

  // Create sample blocks
  const blocks = await Block.insertMany([
    {
      height: 1000000,
      hash: '0000000000000000000123456789abcdef...',
      timestamp: new Date('2024-01-01'),
      transactionCount: 10,
      // ... other fields
    },
    // Add more sample blocks
  ]);

  // Create sample assets
  const assets = await Asset.insertMany([
    {
      assetId: 'SAMPLE_NFT_1',
      name: 'Sample NFT #1',
      type: 'non-fungible',
      creator: 'RDevAddress123...',
      metadata: {
        name: 'Sample NFT #1',
        description: 'A sample NFT for development',
        image: 'QmSampleHash123...',
        imageUrl: 'https://ipfs.io/ipfs/QmSampleHash123...',
        attributes: [
          { trait_type: 'Color', value: 'Blue' },
          { trait_type: 'Rarity', value: 'Common' }
        ]
      },
      createdAt: new Date('2024-01-15'),
      // ... other fields
    },
    // Add more sample assets
  ]);

  console.log(`Seeded ${blocks.length} blocks and ${assets.length} assets`);
  
  await mongoose.disconnect();
}

seedData().catch(console.error);
```

---

## Running Services Locally

### Option 1: Run Services Individually

**Terminal 1 - Backend API**:
```bash
cd backend
npm run dev
# API will run on http://localhost:4004
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# Frontend will run on http://localhost:3000
```

**Terminal 3 - Sync Service (Optional)**:
```bash
cd backend
npm run dev:sync
# Runs the blockchain sync service
```

### Option 2: Run with PM2 (Development Mode)

Create `ecosystem.dev.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'api-dev',
      script: './backend/src/server.js',
      watch: true,
      ignore_watch: ['node_modules', 'logs', '.git'],
      env: {
        NODE_ENV: 'development',
        PORT: 4004
      }
    },
    {
      name: 'frontend-dev',
      script: 'npm',
      args: 'run dev',
      cwd: './frontend',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    }
  ]
};
```

```bash
# Start all services
pm2 start ecosystem.dev.config.js

# View logs
pm2 logs

# Stop all services
pm2 delete all
```

### Package.json Scripts

**Backend `package.json`**:
```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "dev:sync": "nodemon src/services/sync-daemon.js",
    "start": "node src/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "format": "prettier --write \"src/**/*.js\"",
    "db:setup": "node scripts/create-indexes.js",
    "db:seed": "node scripts/seed-data.js",
    "db:reset": "node scripts/reset-database.js"
  }
}
```

**Frontend `package.json`**:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\""
  }
}
```

---

## Development Workflow

### 1. Start a New Feature

```bash
# Create a new branch
git checkout -b feature/asset-search-improvements

# Make changes
# ...

# Test your changes
npm run test
npm run lint

# Commit changes
git add .
git commit -m "feat: improve asset search with fuzzy matching"

# Push to remote
git push origin feature/asset-search-improvements

# Create pull request on GitHub
```

### 2. Daily Development Routine

```bash
# Update main branch
git checkout main
git pull origin main

# Create/switch to feature branch
git checkout -b feature/new-feature
# or
git checkout feature/existing-feature

# Start development servers
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev  # Terminal 2

# Make changes, test, commit frequently

# Before creating PR:
npm run lint
npm run test
npm run build  # Ensure build succeeds
```

### 3. Testing Changes

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- AssetCard.test.js

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### 4. Debugging

**Backend Debugging (VS Code)**:

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/server.js",
      "envFile": "${workspaceFolder}/backend/.env.development"
    }
  ]
}
```

**Frontend Debugging**:
- Use React DevTools browser extension
- Use Next.js built-in debugging (Chrome DevTools)
- Check browser console for errors

**API Testing**:
```bash
# Test API endpoints
curl http://localhost:4004/api/health

# Or use tools like:
# - Postman
# - Insomnia
# - HTTPie
```

---

## Code Style Guidelines

### JavaScript/TypeScript Style

Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript):

```javascript
// ✅ GOOD
const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user:', error);
    throw error;
  }
};

// ❌ BAD
function GetUserByID(userID) {
  var user = User.findById(userID)
  return user
}
```

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserData`, `assetId`)
- **Classes/Components**: PascalCase (`AssetCard`, `UserService`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRIES`)
- **Files**: kebab-case for utilities, PascalCase for components
  - `asset-utils.js`
  - `AssetCard.tsx`

### File Organization

```javascript
// 1. Imports (external dependencies first, then internal)
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { AssetCard } from '@/components/assets/AssetCard';

// 2. Types/Interfaces
interface AssetGridProps {
  filters?: AssetFilters;
}

// 3. Constants
const DEFAULT_LIMIT = 20;

// 4. Main component/function
export function AssetGrid({ filters }: AssetGridProps) {
  // Component logic
}

// 5. Helper functions (if any)
function transformAssetData(asset) {
  // ...
}
```

### React Component Best Practices

```tsx
// ✅ GOOD
import { useState, useCallback } from 'react';

interface AssetCardProps {
  asset: Asset;
  onSelect?: (assetId: string) => void;
  className?: string;
}

export function AssetCard({ asset, onSelect, className }: AssetCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(() => {
    onSelect?.(asset.assetId);
  }, [asset.assetId, onSelect]);

  return (
    <div className={`asset-card ${className}`} onClick={handleClick}>
      {/* Component content */}
    </div>
  );
}

// ❌ BAD
export default function AssetCard(props) {
  return <div onClick={() => props.onSelect(props.asset.assetId)} />;
}
```

### ESLint Configuration

`.eslintrc.js`:
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'next/core-web-vitals',
    'prettier'
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
```

### Prettier Configuration

`.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

---

## Testing Strategy

### Unit Tests

**Backend Tests** (Jest):
```javascript
// tests/services/asset.service.test.js
const { AssetService } = require('../../src/services/asset.service');
const { Asset } = require('../../src/models');

describe('AssetService', () => {
  describe('getAssetById', () => {
    it('should return asset when found', async () => {
      const mockAsset = {
        assetId: 'TEST_ASSET_1',
        name: 'Test Asset',
      };

      jest.spyOn(Asset, 'findOne').mockResolvedValue(mockAsset);

      const result = await AssetService.getAssetById('TEST_ASSET_1');

      expect(result).toEqual(mockAsset);
      expect(Asset.findOne).toHaveBeenCalledWith({ assetId: 'TEST_ASSET_1' });
    });

    it('should return null when asset not found', async () => {
      jest.spyOn(Asset, 'findOne').mockResolvedValue(null);

      const result = await AssetService.getAssetById('NONEXISTENT');

      expect(result).toBeNull();
    });
  });
});
```

**Frontend Tests** (Jest + React Testing Library):
```tsx
// components/assets/AssetCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetCard } from './AssetCard';

describe('AssetCard', () => {
  const mockAsset = {
    assetId: 'TEST_1',
    name: 'Test Asset',
    metadata: {
      description: 'Test description',
      imageUrl: 'https://example.com/image.jpg',
    },
  };

  it('renders asset information', () => {
    render(<AssetCard asset={mockAsset} />);

    expect(screen.getByText('Test Asset')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<AssetCard asset={mockAsset} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalledWith('TEST_1');
  });
});
```

### Integration Tests

```javascript
// tests/integration/api.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('API Integration Tests', () => {
  describe('GET /api/assets', () => {
    it('should return paginated assets', async () => {
      const response = await request(app)
        .get('/api/assets')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should filter assets by type', async () => {
      const response = await request(app)
        .get('/api/assets')
        .query({ type: 'non-fungible' })
        .expect(200);

      expect(response.body.data.every(a => a.type === 'non-fungible')).toBe(true);
    });
  });
});
```

### E2E Tests (Optional)

```javascript
// tests/e2e/asset-browsing.spec.js
const { test, expect } = require('@playwright/test');

test('user can browse and view assets', async ({ page }) => {
  await page.goto('http://localhost:3000/assets');

  // Wait for assets to load
  await page.waitForSelector('.asset-card');

  // Count assets
  const assetCards = await page.$$('.asset-card');
  expect(assetCards.length).toBeGreaterThan(0);

  // Click first asset
  await assetCards[0].click();

  // Verify we're on asset detail page
  await expect(page).toHaveURL(/\/assets\/[A-Z0-9_]+/);

  // Check asset details are displayed
  await expect(page.locator('h1')).toBeVisible();
});
```

---

## Git Workflow

### Branch Naming

- **Features**: `feature/description` (e.g., `feature/asset-search`)
- **Bug Fixes**: `fix/description` (e.g., `fix/pagination-bug`)
- **Documentation**: `docs/description` (e.g., `docs/api-endpoints`)
- **Refactoring**: `refactor/description` (e.g., `refactor/api-client`)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

# Examples
feat: add asset search functionality
feat(api): implement fuzzy search for assets
fix: resolve pagination bug on asset gallery
docs: update API documentation
refactor: simplify asset card component
test: add tests for asset service
chore: update dependencies
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Pull Request Process

1. **Create descriptive PR title and description**
```markdown
# PR Title
feat: Add fuzzy search for assets

# PR Description
## Changes
- Implemented fuzzy matching algorithm for asset search
- Added search relevance scoring
- Updated API endpoint to support fuzzy parameter

## Testing
- Added unit tests for search algorithm
- Tested with various search queries
- Verified performance with large datasets

## Screenshots
[Add screenshots if applicable]
```

2. **Self-review checklist**
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] Build passes
- [ ] Linting passes

3. **Request review from team members**

4. **Address review comments**

5. **Squash and merge once approved**

---

## Contributing Guidelines

### Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make changes
5. Submit a pull request

### Code Review

- All code must be reviewed before merging
- Address all review comments
- Maintain respectful communication
- Be open to feedback and suggestions

### Documentation

- Update documentation when adding features
- Add JSDoc comments for functions
- Keep README and guides up to date

### Testing

- Write tests for new features
- Maintain or improve test coverage
- Fix any failing tests before merging

---

## Export System Development

### Environment Variables

Add to `.env`:

```bash
# Export System
EXPORT_PRICE_USD=2.00
EXPORT_MAX_ASSETS=1000
EXPORT_MAX_TRANSACTIONS=10000
EXPORT_MAX_ADDRESSES=100
EXPORT_MAX_FILE_SIZE_MB=100
EXPORT_MAX_PROCESSING_TIME_SEC=600
EXPORT_RATE_LIMIT_PER_HOUR=10
EXPORT_CONCURRENT_LIMIT=3
EXPORT_QUEUE_MAX_SIZE=50

# Litecoin Payment Node
LITECOIN_RPC_HOST=127.0.0.1
LITECOIN_RPC_PORT=9332
LITECOIN_RPC_USER=ltc_user
LITECOIN_RPC_PASS=secure_password

# Hot Wallet API (for asset creation)
HOT_WALLET_API_URL=https://hwa.raptoreum.com/api/v1
HOT_WALLET_SHARED_SECRET=your_shared_secret
HOT_WALLET_API_TIMEOUT=30000
EXPORT_HOLDER_ADDRESS=RxxxxHolderAddress

# Export Signing
EXPORT_SIGNING_PRIVATE_KEY=path/to/private/key.pem
EXPORT_SIGNING_PUBLIC_KEY=path/to/public/key.pem

# IPFS (local follower node + public fallback)
IPFS_LOCAL_GATEWAY=http://127.0.0.1:8080
IPFS_API_URL=http://127.0.0.1:5001
IPFS_PUBLIC_GATEWAY=https://ipfs.io
IPFS_TIMEOUT=10000

# CoinGecko API
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_CACHE_TTL=300
```

### Testing Export System

```bash
# Generate test signing keys
openssl genrsa -out private_key.pem 4096
openssl rsa -in private_key.pem -pubout -out public_key.pem

# Test export request
curl -X POST http://localhost:4004/api/export/request \
  -H "Content-Type: application/json" \
  -d '{
    "type": "asset",
    "assetId": "TEST_ASSET",
    "includeMedia": false,
    "retention": 86400
  }'

# Check status
curl http://localhost:4004/api/export/status/exp_abc123

# Verify export
curl http://localhost:4004/api/export/verify/RTM_EXPORTS/ASSET_20260214_a3f2c1b9
```

---

## Common Development Tasks

### Adding a New API Endpoint

1. **Define route**:
```javascript
// backend/src/routes/assets.js
router.get('/:assetId/similar', assetController.getSimilarAssets);
```

2. **Create controller**:
```javascript
// backend/src/controllers/assetController.js
exports.getSimilarAssets = async (req, res) => {
  try {
    const { assetId } = req.params;
    const similar = await AssetService.findSimilar(assetId);
    
    res.json({
      success: true,
      data: similar
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};
```

3. **Add service logic**:
```javascript
// backend/src/services/assetService.js
exports.findSimilar = async (assetId) => {
  const asset = await Asset.findOne({ assetId });
  // Implement similarity logic
  return similarAssets;
};
```

4. **Add tests**:
```javascript
// tests/controllers/asset.controller.test.js
describe('getSimilarAssets', () => {
  it('should return similar assets', async () => {
    // Test implementation
  });
});
```

### Adding a New Component

1. **Create component file**:
```tsx
// frontend/components/assets/AssetRecommendations.tsx
import { useQuery } from '@tanstack/react-query';
import { AssetCard } from './AssetCard';

export function AssetRecommendations({ assetId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['similar-assets', assetId],
    queryFn: () => api.getSimilarAssets(assetId),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-4 gap-4">
      {data?.map(asset => (
        <AssetCard key={asset.assetId} asset={asset} />
      ))}
    </div>
  );
}
```

2. **Add to parent component**:
```tsx
// frontend/app/assets/[assetId]/page.tsx
import { AssetRecommendations } from '@/components/assets/AssetRecommendations';

export default function AssetPage({ params }) {
  return (
    <div>
      <AssetDetail assetId={params.assetId} />
      <AssetRecommendations assetId={params.assetId} />
    </div>
  );
}
```

3. **Add tests**:
```tsx
// components/assets/AssetRecommendations.test.tsx
import { render, screen } from '@testing-library/react';
import { AssetRecommendations } from './AssetRecommendations';

test('renders recommendations', () => {
  render(<AssetRecommendations assetId="TEST_1" />);
  // Add assertions
});
```

### Database Migrations

When schema changes are needed:

```javascript
// backend/migrations/001-add-favorites-count.js
module.exports = {
  async up(db) {
    await db.collection('assets').updateMany(
      { favorites: { $exists: false } },
      { $set: { favorites: 0 } }
    );
  },

  async down(db) {
    await db.collection('assets').updateMany(
      {},
      { $unset: { favorites: '' } }
    );
  }
};
```

Run migration:
```bash
npm run migrate
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-13
**Author**: Salty-Dragon
**Status**: Complete - Ready for Implementation
