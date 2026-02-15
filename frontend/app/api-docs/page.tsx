'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE_URL } from '@/lib/constants'
import { BookOpen, Code } from 'lucide-react'

const endpoints = [
  {
    method: 'GET',
    path: '/blockchain/info',
    description: 'Get current blockchain information including block height, difficulty, and sync status',
  },
  {
    method: 'GET',
    path: '/blocks',
    description: 'List recent blocks with pagination (query params: limit, offset)',
  },
  {
    method: 'GET',
    path: '/blocks/:height',
    description: 'Get a specific block by its height',
  },
  {
    method: 'GET',
    path: '/assets',
    description: 'List assets with filtering and pagination (query params: type, hasIpfs, sort, search, limit, offset)',
  },
  {
    method: 'GET',
    path: '/assets/:assetId',
    description: 'Get detailed information about a specific asset',
  },
  {
    method: 'GET',
    path: '/assets/:assetId/transfers',
    description: 'Get the transfer history of a specific asset',
  },
  {
    method: 'GET',
    path: '/assets/:assetId/subassets',
    description: 'Get sub-assets of a specific asset',
  },
  {
    method: 'GET',
    path: '/transactions/:txid',
    description: 'Get details of a specific transaction by its ID',
  },
  {
    method: 'GET',
    path: '/addresses/:address',
    description: 'Get information about a specific address',
  },
  {
    method: 'GET',
    path: '/stats',
    description: 'Get combined blockchain and database statistics',
  },
  {
    method: 'GET',
    path: '/stats/global',
    description: 'Get global asset statistics including total counts, top creators, and recent assets',
  },
  {
    method: 'GET',
    path: '/stats/assets',
    description: 'Get asset statistics by time period (query params: period=24h|7d|30d|all)',
  },
  {
    method: 'GET',
    path: '/stats/creators',
    description: 'Get top asset creators ranked by number of assets created',
  },
  {
    method: 'GET',
    path: '/stats/creators/:address',
    description: 'Get statistics for a specific creator address',
  },
  {
    method: 'POST',
    path: '/export/request',
    description: 'Request an asset export (body: assetName, type)',
  },
  {
    method: 'GET',
    path: '/export/status/:exportId',
    description: 'Get the status of an export request',
  },
  {
    method: 'GET',
    path: '/export/download/:exportId',
    description: 'Download a completed export file',
  },
  {
    method: 'GET',
    path: '/health',
    description: 'Check the API server health status',
  },
  {
    method: 'GET',
    path: '/sync/status',
    description: 'Get the current blockchain synchronization status',
  },
]

export default function ApiDocsPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">API Documentation</h1>
        <p className="text-muted-foreground">
          Reference for the Raptoreum Asset Explorer REST API
        </p>
      </div>

      {/* Base URL */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-accent" />
            Base URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-muted px-3 py-2 text-sm font-mono">
            {API_BASE_URL}
          </code>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-accent" />
        Endpoints
      </h2>
      <div className="space-y-3">
        {endpoints.map((endpoint) => (
          <Card key={`${endpoint.method}-${endpoint.path}`}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                <span
                  className={`inline-flex items-center rounded px-2 py-1 text-xs font-bold uppercase ${
                    endpoint.method === 'GET'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {endpoint.method}
                </span>
                <div className="flex-1">
                  <code className="text-sm font-mono">{endpoint.path}</code>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {endpoint.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Authentication */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Most endpoints are publicly accessible without authentication.
            For higher rate limits, include an API key via the{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">X-API-Key</code>{' '}
            header.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
