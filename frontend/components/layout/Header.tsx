'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/shared/SearchBar'
import { MobileNav } from './MobileNav'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Site Title */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Raptoreum Logo"
            width={32}
            height={32}
            priority
          />
          <span className="hidden font-semibold sm:inline-block">
            Raptoreum Asset Explorer
          </span>
          <span className="font-semibold sm:hidden">RTM Assets</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/assets"
            className="text-sm font-medium transition-colors hover:text-accent"
          >
            Assets
          </Link>
          <Link
            href="/blocks"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Blocks
          </Link>
          <Link
            href="/creators"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Creators
          </Link>
          <Link
            href="/stats"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Stats
          </Link>
          <Link
            href="/api-docs"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            API
          </Link>
        </nav>

        {/* Search Bar (Desktop) */}
        <div className="hidden flex-1 max-w-md mx-6 lg:block">
          <SearchBar />
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Search Bar */}
      <div className="container pb-3 lg:hidden">
        <SearchBar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </header>
  )
}
