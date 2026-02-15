# Raptoreum Asset Explorer

A modern, high-performance blockchain explorer and asset viewer for the Raptoreum blockchain, featuring comprehensive asset discovery, IPFS-integrated metadata, and a professional UI for artists, musicians, and collectors.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)
![MongoDB](https://img.shields.io/badge/mongodb-8.0-green)
![Next.js](https://img.shields.io/badge/next.js-16+-black)

---

## 📋 Overview

The Raptoreum Asset Explorer provides a comprehensive platform for exploring the Raptoreum blockchain, discovering digital assets (both fungible and non-fungible), and accessing blockchain data through a powerful public API. Built with modern web technologies and designed for security, performance, and scalability.

## ✨ Key Features

### Blockchain Explorer
- **Real-time block monitoring** with automatic updates
- **Transaction tracking** with detailed input/output analysis
- **Address lookup** with balance and transaction history
- **Advanced search** across blocks, transactions, addresses, and assets

### Asset Discovery
- **Asset gallery** with grid/list views and filtering
- **NFT showcase** with high-resolution media support
- **Creator profiles** featuring portfolio and statistics
- **Asset metadata** from IPFS with verification
- **Transfer history** with complete provenance tracking

### Public API
- **RESTful endpoints** for programmatic access
- **Rate limiting** with free and premium tiers
- **Comprehensive documentation** with code examples
- **Real-time data** with intelligent caching

### Security & Performance
- **Blockchain verification** for critical operations
- **Audit logging** for compliance and transparency
- **Multi-layer caching** (Redis + Nginx)
- **Rate limiting** to prevent abuse
- **HTTPS only** with modern security headers

## 🏗️ Architecture

The system consists of multiple integrated components:

```
┌─────────────┐
│   Next.js   │  ← Frontend (Port 3000)
│  Frontend   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│    Nginx    │  ← Reverse Proxy + SSL
│   (Port 80/443) │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Node.js   │  ← API Server (Port 4004)
│   Express   │
└──┬────┬─────┘
   │    │
   ↓    ↓
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Redis │ │MongoDB│ │ IPFS │ │Raptor│
│      │ │       │ │      │ │eumd  │
└──────┘ └──────┘ └──────┘ └──────┘
```

**Key Technologies:**
- **Frontend**: Next.js 16+ (App Router), Tailwind CSS, shadcn/ui, React Query, Zustand
- **Backend**: Node.js 24 LTS, Express.js, Mongoose, Winston
- **Database**: MongoDB 8.x with strategic indexing
- **Cache**: Redis 8.x for API responses and rate limiting
- **Storage**: IPFS (Kubo) for decentralized content
- **Blockchain**: Raptoreumd with full indexing enabled
- **Infrastructure**: PM2 (process management), Nginx (reverse proxy), Backblaze B2 (backups)

## 🚀 Quick Start

### Prerequisites

- Node.js 24 LTS
- MongoDB 8.x
- Redis 8.x
- Raptoreumd (full node)
- IPFS (Kubo)

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/Salty-Dragon/rtm-asset-explorer.git
cd rtm-asset-explorer
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Configure environment**
```bash
# Backend
cp backend/.env.example backend/.env.development
# Edit .env.development with your configuration

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit .env.local with your configuration
```

4. **Start services**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- API: http://localhost:4004/api/v1

For detailed development setup, see [DEVELOPMENT.md](DEVELOPMENT.md).

### Production Deployment

For production deployment to OVH server (no Docker), see [DEPLOYMENT.md](DEPLOYMENT.md).

**Using Cloudflare?** See the [Cloudflare SSL Setup Guide](CLOUDFLARE_SSL_SETUP.md) for configuring Origin SSL certificates.

## 📚 Documentation

Comprehensive documentation is available for all aspects of the project:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture, component details, data flows, and deployment architecture
- **[DATABASE.md](DATABASE.md)** - Complete MongoDB schema with 11 collections, indexes, and data integrity rules
- **[API.md](API.md)** - Full API documentation with endpoints, parameters, responses, and code examples (JavaScript, Python, cURL)
- **[NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md)** - Nginx configuration guide for /api/v1 endpoints with troubleshooting
- **[EXPORTS.md](EXPORTS.md)** - Export system documentation with tokenized exports, payment processing, and blockchain verification
- **[FRONTEND.md](FRONTEND.md)** - Frontend specifications including pages, components, design system, state management, and performance optimization
- **[SECURITY.md](SECURITY.md)** - Security guidelines covering input validation, authentication, rate limiting, audit logging, and incident response
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step deployment guide for OVH server with PM2, Nginx, SSL, backups, and monitoring
- **[CLOUDFLARE_SSL_SETUP.md](CLOUDFLARE_SSL_SETUP.md)** - Cloudflare Origin SSL configuration guide for deployments using Cloudflare CDN
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development guide with setup, workflow, code style, testing, and contributing guidelines

## 🔑 API Access

### Public Endpoints

Most endpoints are publicly accessible without authentication:

```bash
# Get blockchain info
curl https://assets.raptoreum.com/api/v1/blockchain/info

# List assets
curl https://assets.raptoreum.com/api/v1/assets?limit=10

# Get asset details
curl https://assets.raptoreum.com/api/v1/assets/ASSET_ID

# Search assets
curl https://assets.raptoreum.com/api/v1/search/assets?q=digital+art
```

### API Key Authentication

For higher rate limits, use API key authentication:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://assets.raptoreum.com/api/v1/assets
```

**Rate Limits:**
- **Free Tier** (no API key): 100 requests/minute
- **Premium Tier** (with API key): 1,000 requests/minute

To request an API key, contact the Raptoreum team or apply through the website.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16+ with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Query (server state) + Zustand (client state)
- **Animations**: Framer Motion
- **Language**: TypeScript

### Backend
- **Runtime**: Node.js 24 LTS
- **Framework**: Express.js 5.x
- **Database**: MongoDB 8.x with Mongoose ODM
- **Cache**: Redis 8.x
- **Logging**: Winston
- **Language**: JavaScript (with JSDoc types)

### Blockchain & Storage
- **Blockchain**: Raptoreumd (full node with indexing)
- **Decentralized Storage**: IPFS (Kubo)
- **Cloud Backup**: Backblaze B2

### Infrastructure
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx
- **SSL/TLS**: Let's Encrypt
- **Monitoring**: PM2 monitoring + custom scripts

## 🏃 Development

### Project Structure

```
rtm-asset-explorer/
├── backend/
│   ├── src/
│   │   ├── server.js          # Main API server
│   │   ├── routes/            # API routes
│   │   ├── controllers/       # Request handlers
│   │   ├── services/          # Business logic
│   │   ├── models/            # MongoDB models
│   │   └── middleware/        # Express middleware
│   ├── tests/                 # Backend tests
│   └── package.json
│
├── frontend/
│   ├── app/                   # Next.js app directory
│   │   ├── page.tsx          # Homepage
│   │   ├── assets/           # Asset pages
│   │   ├── blocks/           # Block pages
│   │   ├── transactions/     # Transaction pages
│   │   └── addresses/        # Address pages
│   ├── components/            # React components
│   ├── lib/                   # Utilities and API client
│   ├── hooks/                 # Custom React hooks
│   └── package.json
│
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
└── ecosystem.config.js        # PM2 configuration
```

### Running Tests

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend
npm test
```

### Code Style

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 🤝 Contributing

We welcome contributions! Please see [DEVELOPMENT.md](DEVELOPMENT.md) for:
- Development setup
- Code style guidelines
- Testing requirements
- Git workflow
- Pull request process

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 🔐 Security

Security is a top priority. We implement:
- Input validation and sanitization
- Rate limiting and DDoS protection
- API key authentication
- Audit logging for compliance
- Blockchain verification for critical operations
- Regular security audits

**Report security vulnerabilities to**: security@raptoreum.com

For detailed security guidelines, see [SECURITY.md](SECURITY.md).

## 📊 System Requirements

### Production Server
- **CPU**: 4+ cores (8 cores recommended)
- **RAM**: 16 GB (32 GB recommended)
- **Storage**: 500 GB SSD (1 TB recommended)
- **Network**: 1 Gbps connection
- **OS**: Ubuntu 22.04 LTS or Debian 12

### Development Machine
- **CPU**: 2+ cores
- **RAM**: 8 GB (16 GB recommended)
- **Storage**: 50 GB free space
- **OS**: macOS, Linux, or Windows with WSL2

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

**Project Maintainer**: Salty-Dragon

**Contributors**: See [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 📞 Contact & Support

- **Website**: https://raptoreum.com
- **Explorer**: https://assets.raptoreum.com
- **Email**: support@raptoreum.com
- **GitHub Issues**: https://github.com/Salty-Dragon/rtm-asset-explorer/issues
- **Discord**: [Raptoreum Discord](https://discord.gg/raptoreum)
- **Twitter**: [@Raptoreum](https://twitter.com/raptoreum)

## 🙏 Acknowledgments

- Raptoreum development team
- Open-source community
- All contributors and supporters

---

**Built with ❤️ for the Raptoreum community**