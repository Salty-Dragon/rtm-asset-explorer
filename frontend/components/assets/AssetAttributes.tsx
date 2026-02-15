import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AssetAttribute } from '@/lib/types'

interface AssetAttributesProps {
  attributes: AssetAttribute[]
  className?: string
}

export function AssetAttributes({ attributes, className }: AssetAttributesProps) {
  if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Attributes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {attributes.map((attr, index) => (
            <div
              key={index}
              className="rounded-lg border bg-muted/50 p-3"
            >
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {attr.trait_type}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">
                  {attr.value}
                </div>
                {attr.display_type && (
                  <Badge variant="secondary" className="text-xs">
                    {attr.display_type}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
