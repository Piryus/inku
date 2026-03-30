import { create } from 'zustand'

export interface OpenTab {
  id: string
  filePath: string
  fileName: string
  content: string
  dirty: boolean
}

interface EditorStore {
  tabs: OpenTab[]
  activeTabId: string | null
  openFile: (filePath: string, fileName: string) => Promise<void>
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateContent: (tabId: string, content: string) => void
  saveTab: (tabId: string) => Promise<void>
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openFile: async (filePath: string, fileName: string) => {
    const { tabs } = get()
    const existing = tabs.find(t => t.filePath === filePath)
    if (existing) {
      set({ activeTabId: existing.id })
      return
    }

    const content = await window.electronAPI.invoke('fs:read-file', filePath)
    const id = crypto.randomUUID()
    const tab: OpenTab = { id, filePath, fileName, content, dirty: false }
    set(s => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }))
  },

  closeTab: (tabId: string) => {
    set(s => {
      const tabs = s.tabs.filter(t => t.id !== tabId)
      let activeTabId = s.activeTabId
      if (activeTabId === tabId) {
        const idx = s.tabs.findIndex(t => t.id === tabId)
        activeTabId = tabs[Math.min(idx, tabs.length - 1)]?.id ?? null
      }
      return { tabs, activeTabId }
    })
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId })
  },

  updateContent: (tabId: string, content: string) => {
    set(s => ({
      tabs: s.tabs.map(t =>
        t.id === tabId ? { ...t, content, dirty: true } : t
      ),
    }))
  },

  saveTab: async (tabId: string) => {
    const tab = get().tabs.find(t => t.id === tabId)
    if (!tab) return
    await window.electronAPI.invoke('fs:write-file', tab.filePath, tab.content)
    set(s => ({
      tabs: s.tabs.map(t =>
        t.id === tabId ? { ...t, dirty: false } : t
      ),
    }))
  },
}))
