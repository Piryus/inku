import { create } from 'zustand'
import type { FileEntry, SearchResult } from '@shared/models'

interface SearchStore {
  query: string
  mode: 'files' | 'content'
  fileResults: FileEntry[]
  contentResults: SearchResult[]
  isSearching: boolean
  setQuery: (query: string) => void
  searchFiles: (query: string) => Promise<void>
  searchContent: (query: string) => Promise<void>
  clear: () => void
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  mode: 'files',
  fileResults: [],
  contentResults: [],
  isSearching: false,

  setQuery: (query: string) => set({ query }),

  searchFiles: async (query: string) => {
    if (!query.trim()) {
      set({ fileResults: [], query, mode: 'files' })
      return
    }
    set({ isSearching: true, query, mode: 'files' })
    const fileResults = await window.electronAPI.invoke('search:files', query)
    set({ fileResults, isSearching: false })
  },

  searchContent: async (query: string) => {
    if (!query.trim()) {
      set({ contentResults: [], query, mode: 'content' })
      return
    }
    set({ isSearching: true, query, mode: 'content' })
    const contentResults = await window.electronAPI.invoke('search:content', query)
    set({ contentResults, isSearching: false })
  },

  clear: () => set({ query: '', fileResults: [], contentResults: [], isSearching: false }),
}))
