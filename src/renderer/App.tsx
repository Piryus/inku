import { useEffect, useState } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { TabBar } from './components/tabs/TabBar'
import { Editor } from './components/editor/Editor'
import { StatusBar } from './components/statusbar/StatusBar'
import { CommandPalette } from './components/command-palette/CommandPalette'
import { useThemeStore } from './stores/theme'

type PaletteMode = 'files' | 'commands' | null

export function App() {
  const { loadThemes } = useThemeStore()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [paletteMode, setPaletteMode] = useState<PaletteMode>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    loadThemes()
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+\ — toggle sidebar
      if (e.metaKey && e.key === '\\') {
        e.preventDefault()
        setSidebarVisible(v => !v)
        return
      }

      // Cmd+Shift+P — command palette (commands mode)
      if (e.metaKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setPaletteMode(m => (m === 'commands' ? null : 'commands'))
        return
      }

      // Cmd+P — command palette (files mode)
      if (e.metaKey && !e.shiftKey && e.key === 'p') {
        e.preventDefault()
        setPaletteMode(m => (m === 'files' ? null : 'files'))
        return
      }

      // Cmd+, — settings
      if (e.metaKey && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(v => !v)
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--color-bg-primary)' }}>
      {sidebarVisible && <Sidebar />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TabBar />
        <Editor />
        <StatusBar />
      </div>

      {paletteMode !== null && (
        <CommandPalette
          mode={paletteMode}
          onClose={() => setPaletteMode(null)}
        />
      )}
    </div>
  )
}
