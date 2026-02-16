'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/shared/CopyButton'
import { formatUSD } from '@/lib/formatters'

interface PaymentInfoProps {
  address: string
  amount: number
  currency: 'LTC'
  amountUsd: number
  expiresAt: string
  className?: string
}

export function PaymentInfo({
  address,
  amount,
  currency,
  amountUsd,
  expiresAt,
  className,
}: PaymentInfoProps) {
  const [timeRemaining, setTimeRemaining] = useState('')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining('Expired')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Payment Required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="rounded-lg border bg-white p-4">
            <QRCodeSVG value={address} size={200} level="M" />
          </div>
        </div>

        {/* Payment Address */}
        <div>
          <div className="mb-2 text-sm font-medium text-muted-foreground">
            {currency} Payment Address
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
            <code className="flex-1 font-mono text-sm break-all">{address}</code>
            <CopyButton text={address} />
          </div>
        </div>

        {/* Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Amount</div>
            <div className="text-xl font-bold">
              {amount} {currency}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">USD Equivalent</div>
            <div className="text-xl font-bold">{formatUSD(amountUsd)}</div>
          </div>
        </div>

        {/* Timer */}
        <div className="rounded-lg border-2 border-warning bg-warning/10 p-4">
          <div className="flex items-center gap-2 text-warning">
            <Clock className="h-5 w-5" />
            <div>
              <div className="font-semibold">Payment window expires in</div>
              <div className="text-2xl font-bold">{timeRemaining}</div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            Send exactly <strong>{amount} {currency}</strong> to the address above.
          </p>
          <p className="text-xs">
            Note: Raptoreum (RTM) payment support coming soon. For now, we accept LTC only.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
