import { useState, useEffect } from 'react'
import { useDebounce } from './useDebounce'
import { detectQueryType } from '@/lib/validators'
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants'

export interface SearchState {
  query: string
  debouncedQuery: string
  type: 'address' | 'txid' | 'block_hash' | 'block_height' | 'asset' | 'cid' | 'text'
  isSearching: boolean
}

/**
 * Hook for smart search with debouncing and type detection
 */
export function useSearch(initialQuery = '', delay = SEARCH_DEBOUNCE_MS) {
  const [query, setQuery] = useState(initialQuery)
  const [isSearching, setIsSearching] = useState(false)
  const debouncedQuery = useDebounce(query, delay)

  const queryType = detectQueryType(debouncedQuery)

  useEffect(() => {
    if (query !== debouncedQuery) {
      setIsSearching(true)
    } else {
      setIsSearching(false)
    }
  }, [query, debouncedQuery])

  const clearSearch = () => {
    setQuery('')
  }

  return {
    query,
    setQuery,
    debouncedQuery,
    queryType,
    isSearching,
    clearSearch,
  }
}
