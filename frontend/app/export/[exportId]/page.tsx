'use client'

import { use } from 'react'
import { useExportStatus } from '@/hooks/useApi'
import { ExportStatus } from '@/components/export/ExportStatus'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ExportStatusPage({
  params,
}: {
  params: Promise<{ exportId: string }>
}) {
  const { exportId } = use(params)
  const { data, isLoading, error } = useExportStatus(exportId)

  if (isLoading) {
    return (
      <div className="container py-12">
        <LoadingSpinner text="Loading export status..." />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="container py-12">
        <ErrorMessage
          title="Export Not Found"
          message="The export you're looking for doesn't exist or couldn't be loaded."
        />
        <div className="mt-6">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const exportStatus = data.data

  return (
    <div className="container py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Export Status</h1>
        <p className="text-muted-foreground">
          Track the progress of your export request
        </p>
      </div>

      {/* Export Status */}
      <div className="mx-auto max-w-3xl">
        <ExportStatus status={exportStatus} />
      </div>
    </div>
  )
}
