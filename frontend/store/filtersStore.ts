// Store for asset filter state

import { create } from 'zustand'
import type { AssetFilters } from '@/lib/types'

interface FiltersStore extends AssetFilters {
  setType: (type: AssetFilters['type']) => void
  setHasIpfs: (hasIpfs: boolean) => void
  setSort: (sort: AssetFilters['sort']) => void
  setSearch: (search: string) => void
  reset: () => void
}

const defaultFilters: AssetFilters = {
  type: 'all',
  hasIpfs: undefined,
  sort: 'newest',
  search: '',
}

export const useFiltersStore = create<FiltersStore>((set) => ({
  ...defaultFilters,

  setType: (type) => set({ type }),
  setHasIpfs: (hasIpfs) => set({ hasIpfs }),
  setSort: (sort) => set({ sort }),
  setSearch: (search) => set({ search }),

  reset: () => set(defaultFilters),
}))
