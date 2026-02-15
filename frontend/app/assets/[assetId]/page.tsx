'use client'

import { useState, use } from 'react'
import { useAsset } from '@/hooks/useApi'
import { AssetDetail } from '@/components/assets/AssetDetail'
import { ExportDialog } from '@/components/export/ExportDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>
}) {
  const { assetId } = use(params)
  const router = useRouter()
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const { data, isLoading, error } = useAsset(assetId)

  const handleExportCreated = (exportId: string) => {
    router.push(`/export/${exportId}`)
  }

  if (isLoading) {
    return (
      <div className="container py-12">
        <LoadingSpinner text="Loading asset..." />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="container py-12">
        <div className="mb-4">
          <Button asChild variant="ghost">
            <Link href="/assets">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Assets
            </Link>
          </Button>
        </div>
        <ErrorMessage
          title="Asset Not Found"
          message="The asset you're looking for doesn't exist or couldn't be loaded."
        />
      </div>
    )
  }

  const asset = data.data

  return (
    <div className="container py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button asChild variant="ghost">
          <Link href="/assets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Link>
        </Button>
      </div>

      {/* Asset Detail */}
      <AssetDetail
        asset={asset}
        onExport={() => setExportDialogOpen(true)}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        assetName={asset.name}
        onExportCreated={handleExportCreated}
      />
    </div>
  )
}
