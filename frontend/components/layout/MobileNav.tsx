'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/80 transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-sm transform bg-background p-6 shadow-lg transition-transform md:hidden',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-4">
          <Link
            href="/assets"
            onClick={onClose}
            className="text-lg font-medium transition-colors hover:text-accent"
          >
            Assets
          </Link>
          <Link
            href="/blocks"
            onClick={onClose}
            className="text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Blocks
          </Link>
          <Link
            href="/creators"
            onClick={onClose}
            className="text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Creators
          </Link>
          <Link
            href="/stats"
            onClick={onClose}
            className="text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Stats
          </Link>
          <Link
            href="/api-docs"
            onClick={onClose}
            className="text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            API Docs
          </Link>
        </nav>
      </div>
    </>
  )
}
