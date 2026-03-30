import { create } from 'zustand'
import type { Tag, FileEntry } from '@shared/models'

interface TagsStore {
  tags: Tag[]
  activeTag: string | null
  filteredFiles: FileEntry[]
  loadTags: () => Promise<void>
  filterByTag: (tag: string | null) => Promise<void>
}

export const useTagsStore = create<TagsStore>((set) => ({
  tags: [],
  activeTag: null,
  filteredFiles: [],

  loadTags: async () => {
    const tags = await window.electronAPI.invoke('tags:list')
    set({ tags })
  },

  filterByTag: async (tag: string | null) => {
    if (!tag) {
      set({ activeTag: null, filteredFiles: [] })
      return
    }
    const files = await window.electronAPI.invoke('tags:files-by-tag', tag)
    set({ activeTag: tag, filteredFiles: files })
  },
}))
