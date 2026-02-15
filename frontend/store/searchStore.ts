// Store for recent searches with persistence

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SearchHistoryItem {
  id: string
  query: string
  type: 'address' | 'txid' | 'block_hash' | 'block_height' | 'asset' | 'cid' | 'text'
  timestamp: number
}

interface SearchStore {
  recentSearches: SearchHistoryItem[]
  addSearch: (query: string, type: SearchHistoryItem['type']) => void
  removeSearch: (id: string) => void
  clearHistory: () => void
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set) => ({
      recentSearches: [],

      addSearch: (query, type) => {
        const id = Date.now().toString()
        const newSearch: SearchHistoryItem = {
          id,
          query,
          type,
          timestamp: Date.now(),
        }

        set((state) => {
          // Remove duplicate queries
          const filtered = state.recentSearches.filter(
            (search) => search.query.toLowerCase() !== query.toLowerCase()
          )

          // Keep only the last 20 searches
          const updated = [newSearch, ...filtered].slice(0, 20)

          return { recentSearches: updated }
        })
      },

      removeSearch: (id) => {
        set((state) => ({
          recentSearches: state.recentSearches.filter((search) => search.id !== id),
        }))
      },

      clearHistory: () => {
        set({ recentSearches: [] })
      },
    }),
    {
      name: 'search-history',
    }
  )
)
