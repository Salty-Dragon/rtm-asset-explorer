'use client'

import { Download, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { PaymentInfo } from './PaymentInfo'
import { formatExportStatus } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { ExportStatus as ExportStatusType } from '@/lib/types'

interface ExportStatusProps {
  status: ExportStatusType
  className?: string
}

export function ExportStatus({ status, className }: ExportStatusProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending_payment':
        return <Clock className="h-5 w-5 text-warning" />
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-info" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />
      case 'failed':
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-error" />
      default:
        return null
    }
  }

  const getStatusVariant = (): 'default' | 'secondary' | 'success' | 'warning' | 'info' => {
    switch (status.status) {
      case 'pending_payment':
        return 'warning'
      case 'processing':
        return 'info'
      case 'completed':
        return 'success'
      case 'failed':
      case 'expired':
        return 'secondary'
      default:
        return 'default'
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Export Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Status</span>
            <Badge variant={getStatusVariant()}>{formatExportStatus(status.status)}</Badge>
          </div>

          {/* Export ID */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Export ID</span>
            <code className="text-sm font-mono">{status.exportId}</code>
          </div>

          <Separator />

          {/* Progress (for processing status) */}
          {status.status === 'processing' && status.progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status.progress.step}</span>
                <span className="font-medium">{status.progress.percentage}%</span>
              </div>
              <Progress value={status.progress.percentage} />
              {status.queuePosition !== undefined && status.queuePosition > 0 && (
                <p className="text-sm text-muted-foreground">
                  Queue position: {status.queuePosition}
                </p>
              )}
            </div>
          )}

          {/* Download Button (for completed status) */}
          {status.status === 'completed' && status.downloadUrl && (
            <Button asChild className="w-full" size="lg">
              <a href={status.downloadUrl} download>
                <Download className="mr-2 h-4 w-4" />
                Download Export
              </a>
            </Button>
          )}

          {/* Error Message (for failed status) */}
          {status.status === 'failed' && status.error && (
            <div className="rounded-lg border border-error/20 bg-error/10 p-4 text-sm text-error">
              {status.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Info (for pending_payment status) */}
      {status.status === 'pending_payment' && !status.payment.paid && (
        <PaymentInfo
          address={status.payment.address}
          amount={status.payment.amount}
          currency={status.payment.currency}
          amountUsd={0} // TODO: Calculate from API
          expiresAt={status.payment.expiresAt}
        />
      )}

      {/* Verification Info (for completed status) */}
      {status.status === 'completed' && status.verification && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blockchain Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Asset Name</div>
              <div className="font-medium">{status.verification.assetName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Transaction ID</div>
              <code className="text-sm font-mono">{status.verification.txid}</code>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Block Height</div>
              <div className="font-medium">{status.verification.blockHeight}</div>
            </div>
            {status.verification.ipfsHash && (
              <div>
                <div className="text-sm text-muted-foreground">IPFS Hash</div>
                <code className="text-sm font-mono">{status.verification.ipfsHash}</code>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm text-success font-medium">
                Verified on Blockchain
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
