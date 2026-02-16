import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/shared/CopyButton'
import type { AssetMetadata as AssetMetadataType } from '@/lib/types'

interface AssetMetadataProps {
  metadata: AssetMetadataType
  className?: string
}

export function AssetMetadata({ metadata, className }: AssetMetadataProps) {
  const entries = Object.entries(metadata).filter(
    ([key]) => !['attributes', 'image', 'imageUrl', 'name', 'description'].includes(key)
  )

  if (entries.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Metadata</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {entries.map(([key, value]) => (
            <div key={key} className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}
              </dt>
              <dd className="flex items-center justify-between gap-2">
                <span className="text-sm break-all">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
                {typeof value === 'string' && value.length > 20 && (
                  <CopyButton text={value} size="sm" />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
