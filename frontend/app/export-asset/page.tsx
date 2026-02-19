'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Download, FileText, Scale, Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRequestExport } from '@/hooks/useApi'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import type { ExportRequest } from '@/lib/types'

export default function ExportAssetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const assetId = searchParams.get('assetId') || ''

  const [exportType, setExportType] = useState<'standard' | 'provenance' | 'legal'>('standard')
  const [includeTransactions, setIncludeTransactions] = useState(true)
  const [includeMedia, setIncludeMedia] = useState(true)
  const [legalInfo, setLegalInfo] = useState({
    caseReference: '',
    court: '',
    purpose: '',
  })

  const requestExportMutation = useRequestExport()

  const handleSubmit = async () => {
    // Map frontend type to backend type
    const backendType = exportType === 'standard' ? 'asset' : exportType
    
    const exportData: ExportRequest = {
      type: backendType,
      assetId,
      includeTransactions,
      includeMedia,
    }

    if (exportType === 'legal') {
      exportData.legalInfo = legalInfo
    }

    try {
      const result = await requestExportMutation.mutateAsync(exportData)
      if (result.data) {
        router.push(`/export/${result.data.exportId}`)
      }
    } catch {
      // Error is handled by mutation
    }
  }

  return (
    <div className="container py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button asChild variant="ghost">
          <Link href={assetId ? `/assets/${assetId}` : '/'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {assetId ? 'Back to Asset' : 'Back to Home'}
          </Link>
        </Button>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Export Asset</h1>
        <p className="text-lg text-muted-foreground">
          Export detailed information and provenance data for blockchain verification
        </p>
      </div>

      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Create Export</CardTitle>
            <CardDescription>
              {assetId 
                ? `Exporting data for asset: ${assetId}`
                : 'Please provide an asset ID to export'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Asset ID Input (if not provided in URL) */}
            {!assetId && (
              <div className="space-y-3">
                <Label>Asset ID</Label>
                <ErrorMessage
                  title="Asset ID Required"
                  message="Please navigate to this page from an asset detail page, or provide an asset ID in the URL as ?assetId=ASSET_NAME"
                />
              </div>
            )}

            {assetId && (
              <>
                {/* Export Type Selection */}
                <div className="space-y-3">
                  <Label>Export Type</Label>
                  <RadioGroup 
                    value={exportType} 
                    onValueChange={(value: string) => setExportType(value as 'standard' | 'provenance' | 'legal')}
                  >
                    <div className="flex items-start space-x-3 rounded-lg border p-4">
                      <RadioGroupItem value="standard" id="standard" />
                      <div className="flex-1">
                        <Label htmlFor="standard" className="flex items-center gap-2 cursor-pointer">
                          <FileText className="h-4 w-4" />
                          <span className="font-semibold">Standard Export</span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Basic asset information and transaction history
                        </p>
                      </div>
                    </div>

                    {/* Standard Export Details */}
                    {exportType === 'standard' && (
                      <div className="ml-8 space-y-2 rounded-lg border p-4 bg-muted/50">
                        <p className="text-sm font-medium">Includes:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Asset metadata and properties</li>
                          <li>• Full transfer history</li>
                          <li>• Current ownership information</li>
                          <li>• Associated IPFS content metadata</li>
                          <li>• Transaction details</li>
                          <li className="pt-2 font-medium text-foreground">
                            Formats: JSON, CSV, and PDF in a ZIP archive
                          </li>
                        </ul>
                      </div>
                    )}

                    <div className="flex items-start space-x-3 rounded-lg border p-4">
                      <RadioGroupItem value="provenance" id="provenance" />
                      <div className="flex-1">
                        <Label htmlFor="provenance" className="flex items-center gap-2 cursor-pointer">
                          <Shield className="h-4 w-4" />
                          <span className="font-semibold">Provenance Report</span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Complete ownership chain with verification data
                        </p>
                      </div>
                    </div>

                    {/* Provenance Report Details */}
                    {exportType === 'provenance' && (
                      <div className="ml-8 space-y-2 rounded-lg border p-4 bg-muted/50">
                        <p className="text-sm font-medium">Includes:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Complete ownership history</li>
                          <li>• Chain of custody documentation</li>
                          <li>• Transfer verification data</li>
                          <li>• Timestamp verification</li>
                          <li>• Blockchain proof of ownership</li>
                          <li className="pt-2 font-medium text-foreground">
                            Formats: JSON, CSV, and PDF in a ZIP archive
                          </li>
                        </ul>
                      </div>
                    )}

                    <div className="flex items-start space-x-3 rounded-lg border p-4">
                      <RadioGroupItem value="legal" id="legal" />
                      <div className="flex-1">
                        <Label htmlFor="legal" className="flex items-center gap-2 cursor-pointer">
                          <Scale className="h-4 w-4" />
                          <span className="font-semibold">Legal Documentation</span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Court-ready documentation with case information
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <Label>Export Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="transactions"
                        checked={includeTransactions}
                        onCheckedChange={(checked) => setIncludeTransactions(checked as boolean)}
                      />
                      <Label htmlFor="transactions" className="cursor-pointer">
                        Include full transaction details
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="media"
                        checked={includeMedia}
                        onCheckedChange={(checked) => setIncludeMedia(checked as boolean)}
                      />
                      <Label htmlFor="media" className="cursor-pointer">
                        Include IPFS media files
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Legal Information (only for legal type) */}
                {exportType === 'legal' && (
                  <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
                    <Label>Legal Case Information</Label>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="caseReference" className="text-sm">
                          Case Reference Number
                        </Label>
                        <Input
                          id="caseReference"
                          value={legalInfo.caseReference}
                          onChange={(e) =>
                            setLegalInfo({ ...legalInfo, caseReference: e.target.value })
                          }
                          placeholder="e.g., CV-2024-12345"
                        />
                      </div>
                      <div>
                        <Label htmlFor="court" className="text-sm">
                          Court Name
                        </Label>
                        <Input
                          id="court"
                          value={legalInfo.court}
                          onChange={(e) => setLegalInfo({ ...legalInfo, court: e.target.value })}
                          placeholder="e.g., Superior Court of California"
                        />
                      </div>
                      <div>
                        <Label htmlFor="purpose" className="text-sm">
                          Purpose
                        </Label>
                        <Input
                          id="purpose"
                          value={legalInfo.purpose}
                          onChange={(e) => setLegalInfo({ ...legalInfo, purpose: e.target.value })}
                          placeholder="e.g., Evidence for copyright case"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {requestExportMutation.isError && (
                  <ErrorMessage
                    title="Export Request Failed"
                    message={requestExportMutation.error?.message || 'Failed to create export request'}
                  />
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    onClick={handleSubmit}
                    size="lg"
                    disabled={
                      requestExportMutation.isPending ||
                      (exportType === 'legal' &&
                        (!legalInfo.caseReference || !legalInfo.court || !legalInfo.purpose))
                    }
                  >
                    {requestExportMutation.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Request Export ($2.00 USD)
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>About Exports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Cost & Payment</h4>
              <p className="text-sm text-muted-foreground">
                All exports cost $2.00 USD, paid in Litecoin. You&apos;ll receive a payment address after submitting your request.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Security & Verification</h4>
              <p className="text-sm text-muted-foreground">
                All exports are cryptographically signed and tokenized on the Raptoreum blockchain for permanent verification.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Formats</h4>
              <p className="text-sm text-muted-foreground">
                Every export includes JSON, CSV, and PDF formats packaged in a ZIP archive for maximum compatibility.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
