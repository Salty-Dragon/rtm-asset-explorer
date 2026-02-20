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
        return (
          <div className="rounded-lg bg-warning/10 p-2">
            <Clock className="h-5 w-5 text-warning animate-pulse" />
          </div>
        )
      case 'processing':
        return (
          <div className="rounded-lg bg-info/10 p-2">
            <Loader2 className="h-5 w-5 animate-spin text-info" />
          </div>
        )
      case 'completed':
        return (
          <div className="rounded-lg bg-success/10 p-2">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
        )
      case 'failed':
      case 'expired':
        return (
          <div className="rounded-lg bg-error/10 p-2">
            <AlertCircle className="h-5 w-5 text-error" />
          </div>
        )
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
    <div className={cn('space-y-6 animate-fade-in', className)}>
      {/* Status Card */}
      <Card className="border-border hover:border-accent/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
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
                <span className="font-medium text-info">{status.progress.percentage}%</span>
              </div>
              <Progress value={status.progress.percentage} className="[&>div]:bg-info" />
              {status.queuePosition !== undefined && status.queuePosition > 0 && (
                <p className="text-sm text-muted-foreground">
                  Queue position: {status.queuePosition}
                </p>
              )}
            </div>
          )}

          {/* Download Button (for completed status) */}
          {status.status === 'completed' && status.downloadUrl && (
            <Button asChild className="w-full bg-accent hover:bg-accent/90 text-white transition-colors" size="lg">
              <a href={status.downloadUrl} download>
                <Download className="mr-2 h-4 w-4" />
                Download Export
              </a>
            </Button>
          )}

          {/* Error Message (for failed status) */}
          {status.status === 'failed' && status.error && (
            <div className="rounded-lg border border-error/30 bg-error/10 p-4 text-sm text-error">
              <div className="flex items-center gap-2 mb-1 font-medium">
                <AlertCircle className="h-4 w-4" />
                Export Failed
              </div>
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
          amountUsd={status.payment.amountUsd}
          expiresAt={status.payment.expiresAt}
        />
      )}

      {/* Verification Info (for completed status) */}
      {status.status === 'completed' && status.verification && (
        <Card className="border-success/30 hover:border-success/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="rounded-lg bg-success/10 p-2">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              Blockchain Verification
            </CardTitle>
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
            <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3">
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
