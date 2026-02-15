'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
        <p className="mb-6 text-muted-foreground">
          An unexpected error occurred. This may be due to a temporary connection issue with the backend services.
        </p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  )
}
