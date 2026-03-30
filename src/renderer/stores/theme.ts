import { create } from 'zustand'
import type { ThemeManifest, ThemeColors } from '@shared/theme-types'
import { defaultDarkColors } from '../themes/tokens'
import { applyTheme } from '../themes/loader'

interface ThemeStore {
  themes: ThemeManifest[]
  activeThemeId: string
  colors: ThemeColors
  loadThemes: () => Promise<void>
  setTheme: (id: string) => Promise<void>
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themes: [],
  activeThemeId: 'inku-dark',
  colors: defaultDarkColors,

  loadThemes: async () => {
    const themes = await window.electronAPI.invoke('themes:list')
    set({ themes })
    const active = themes.find(t => t.id === get().activeThemeId)
    if (active) {
      applyTheme(active.colors)
      set({ colors: active.colors })
    }
  },

  setTheme: async (id: string) => {
    const { themes } = get()
    const theme = themes.find(t => t.id === id)
    if (!theme) return
    applyTheme(theme.colors)
    set({ activeThemeId: id, colors: theme.colors })
    await window.electronAPI.invoke('themes:set', id)
  },
}))
