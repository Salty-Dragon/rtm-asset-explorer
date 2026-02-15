'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSearch as useSearchHook } from '@/hooks/useSearch'
import { useSearch } from '@/hooks/useApi'
import { useSearchStore } from '@/store/searchStore'
import { SearchResults } from './SearchResults'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  className?: string
  placeholder?: string
  autoFocus?: boolean
}

export function SearchBar({
  className,
  placeholder = 'Search assets, addresses, transactions...',
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { query, setQuery, debouncedQuery, queryType, clearSearch } = useSearchHook()
  const { addSearch, recentSearches } = useSearchStore()

  // Fetch search results
  const { data: searchResults, isLoading } = useSearch(debouncedQuery)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      addSearch(query.trim(), queryType)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleClear = () => {
    clearSearch()
    inputRef.current?.focus()
  }

  const handleFocus = () => {
    setIsOpen(true)
  }

  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery)
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    setIsOpen(false)
  }

  const showDropdown = isOpen && (debouncedQuery.length >= 2 || recentSearches.length > 0)

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
          aria-label="Search"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Search results dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-[500px] overflow-y-auto rounded-lg border bg-popover shadow-lg">
          {debouncedQuery.length >= 2 ? (
            <SearchResults
              results={searchResults?.data}
              isLoading={isLoading}
              query={debouncedQuery}
              onClose={() => setIsOpen(false)}
            />
          ) : (
            // Show recent searches
            recentSearches.length > 0 && (
              <div className="p-2">
                <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </div>
                {recentSearches.slice(0, 5).map((search) => (
                  <button
                    key={search.id}
                    onClick={() => handleRecentSearchClick(search.query)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{search.query}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
