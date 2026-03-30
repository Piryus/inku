import { create } from 'zustand'
import type { PluginManifest } from '@shared/plugin-types'

interface PluginsStore {
  plugins: PluginManifest[]
  loadPlugins: () => Promise<void>
  togglePlugin: (id: string, enabled: boolean) => Promise<void>
}

export const usePluginsStore = create<PluginsStore>((set) => ({
  plugins: [],

  loadPlugins: async () => {
    const plugins = await window.electronAPI.invoke('plugins:list')
    set({ plugins })
  },

  togglePlugin: async (id: string, enabled: boolean) => {
    await window.electronAPI.invoke('plugins:toggle', id, enabled)
    set(s => ({
      plugins: s.plugins.map(p =>
        p.id === id ? { ...p, enabled } : p
      ),
    }))
  },
}))
