import { create } from 'zustand'
import type { Root, TreeNode, FileEntry } from '@shared/models'

interface FilesStore {
  roots: Root[]
  trees: Record<string, TreeNode[]>
  selectedFile: FileEntry | null
  loadRoots: () => Promise<void>
  addRoot: (path: string) => Promise<void>
  removeRoot: (rootId: string) => Promise<void>
  loadTree: (rootId: string) => Promise<void>
  selectFile: (file: FileEntry) => void
  refreshTrees: () => Promise<void>
}

export const useFilesStore = create<FilesStore>((set, get) => ({
  roots: [],
  trees: {},
  selectedFile: null,

  loadRoots: async () => {
    const roots = await window.electronAPI.invoke('fs:list-roots')
    set({ roots })
    for (const root of roots) {
      await get().loadTree(root.id)
    }
  },

  addRoot: async (path: string) => {
    const root = await window.electronAPI.invoke('fs:add-root', path)
    set(s => ({ roots: [...s.roots, root] }))
    await get().loadTree(root.id)
  },

  removeRoot: async (rootId: string) => {
    await window.electronAPI.invoke('fs:remove-root', rootId)
    set(s => ({
      roots: s.roots.filter(r => r.id !== rootId),
      trees: Object.fromEntries(
        Object.entries(s.trees).filter(([k]) => k !== rootId)
      ),
    }))
  },

  loadTree: async (rootId: string) => {
    const tree = await window.electronAPI.invoke('fs:list-tree', rootId)
    set(s => ({ trees: { ...s.trees, [rootId]: tree } }))
  },

  selectFile: (file: FileEntry) => {
    set({ selectedFile: file })
  },

  refreshTrees: async () => {
    const { roots } = get()
    for (const root of roots) {
      await get().loadTree(root.id)
    }
  },
}))
