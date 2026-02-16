'use client'

import { useState } from 'react'
import { Download, FileText, Scale, Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { useRequestExport } from '@/hooks/useApi'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import type { ExportRequest } from '@/lib/types'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  assetName: string
  onExportCreated?: (exportId: string) => void
}

export function ExportDialog({
  open,
  onClose,
  assetName,
  onExportCreated,
}: ExportDialogProps) {
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
    const exportData: ExportRequest = {
      assetName,
      type: exportType,
      options: {
        includeTransactions,
        includeMedia,
      },
    }

    if (exportType === 'legal') {
      exportData.legalInfo = legalInfo
    }

    try {
      const result = await requestExportMutation.mutateAsync(exportData)
      if (result.data && onExportCreated) {
        onExportCreated(result.data.exportId)
      }
      onClose()
    } catch {
      // Error is handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Asset</DialogTitle>
          <DialogDescription>
            Export detailed information and provenance data for {assetName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Type Selection */}
          <div className="space-y-3">
            <Label>Export Type</Label>
            <RadioGroup value={exportType} onValueChange={(value: string) => setExportType(value as 'standard' | 'provenance' | 'legal')}>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={requestExportMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
