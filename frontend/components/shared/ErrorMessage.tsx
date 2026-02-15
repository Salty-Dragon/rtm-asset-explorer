import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  title?: string
  message: string
  className?: string
}

export function ErrorMessage({ title = 'Error', message, className }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-error/20 bg-error/10 p-6 text-center',
        className
      )}
    >
      <AlertCircle className="h-8 w-8 text-error" />
      <div>
        <h3 className="font-semibold text-error">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
