'use client'

import { useState, Suspense } from 'react'
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

function ExportAssetPageContent() {
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
    <div className="container py-8 animate-fade-in">
      {/* Back Button */}
      <div className="mb-6">
        <Button asChild variant="ghost" className="hover:text-accent transition-colors">
          <Link href={assetId ? `/assets/${assetId}` : '/'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {assetId ? 'Back to Asset' : 'Back to Home'}
          </Link>
        </Button>
      </div>

      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-accent/10 p-3">
            <Download className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-4xl font-bold">
            Export <span className="text-accent">Asset</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground pl-1">
          Export detailed information and provenance data for blockchain verification
        </p>
      </div>

      <div className="mx-auto max-w-4xl">
        <Card className="border-border hover:border-accent/50 transition-colors">
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
                    className="space-y-2"
                  >
                    <div className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${exportType === 'standard' ? 'border-accent bg-accent/5' : 'hover:border-accent/50 hover:bg-accent/5'}`}>
                      <RadioGroupItem value="standard" id="standard" />
                      <div className="flex-1">
                        <Label htmlFor="standard" className="flex items-center gap-2 cursor-pointer">
                          <div className="rounded-md bg-info/10 p-1.5">
                            <FileText className="h-4 w-4 text-info" />
                          </div>
                          <span className="font-semibold">Standard Export</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Basic asset information and transaction history
                        </p>
                      </div>
                    </div>

                    {/* Standard Export Details */}
                    {exportType === 'standard' && (
                      <div className="ml-8 space-y-2 rounded-lg border border-info/20 p-4 bg-info/5 animate-slide-up">
                        <p className="text-sm font-medium text-info">Includes:</p>
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

                    <div className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${exportType === 'provenance' ? 'border-accent bg-accent/5' : 'hover:border-accent/50 hover:bg-accent/5'}`}>
                      <RadioGroupItem value="provenance" id="provenance" />
                      <div className="flex-1">
                        <Label htmlFor="provenance" className="flex items-center gap-2 cursor-pointer">
                          <div className="rounded-md bg-success/10 p-1.5">
                            <Shield className="h-4 w-4 text-success" />
                          </div>
                          <span className="font-semibold">Provenance Report</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Complete ownership chain with verification data
                        </p>
                      </div>
                    </div>

                    {/* Provenance Report Details */}
                    {exportType === 'provenance' && (
                      <div className="ml-8 space-y-2 rounded-lg border border-success/20 p-4 bg-success/5 animate-slide-up">
                        <p className="text-sm font-medium text-success">Includes:</p>
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

                    <div className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${exportType === 'legal' ? 'border-accent bg-accent/5' : 'hover:border-accent/50 hover:bg-accent/5'}`}>
                      <RadioGroupItem value="legal" id="legal" />
                      <div className="flex-1">
                        <Label htmlFor="legal" className="flex items-center gap-2 cursor-pointer">
                          <div className="rounded-md bg-warning/10 p-1.5">
                            <Scale className="h-4 w-4 text-warning" />
                          </div>
                          <span className="font-semibold">Legal Documentation</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
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
                  <div className="space-y-3 rounded-lg border border-warning/20 p-4 bg-warning/5 animate-slide-up">
                    <Label className="text-warning">Legal Case Information</Label>
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
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    onClick={handleSubmit}
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-white transition-colors"
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
                        Request Export{' '}
                        <span className="ml-1 rounded-md bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
                          $2.00 USD
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-border hover:border-accent/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-accent/10 p-2">
                <Shield className="h-4 w-4 text-accent" />
              </div>
              About Exports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent/5 p-4">
              <h4 className="font-semibold mb-2 text-accent">Cost & Payment</h4>
              <p className="text-sm text-muted-foreground">
                All exports cost $2.00 USD, paid in Litecoin. You&apos;ll receive a payment address after submitting your request.
              </p>
            </div>
            <div className="rounded-lg bg-success/5 p-4">
              <h4 className="font-semibold mb-2 text-success">Security & Verification</h4>
              <p className="text-sm text-muted-foreground">
                All exports are cryptographically signed and tokenized on the Raptoreum blockchain for permanent verification.
              </p>
            </div>
            <div className="rounded-lg bg-info/5 p-4">
              <h4 className="font-semibold mb-2 text-info">Formats</h4>
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

export default function ExportAssetPage() {
  return (
    <Suspense fallback={
      <div className="container py-12">
        <LoadingSpinner text="Loading export form..." />
      </div>
    }>
      <ExportAssetPageContent />
    </Suspense>
  )
}
