import { useEffect, useState } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { TabBar } from './components/tabs/TabBar'
import { Editor } from './components/editor/Editor'
import { StatusBar } from './components/statusbar/StatusBar'
import { useThemeStore } from './stores/theme'

export function App() {
  const { loadThemes } = useThemeStore()
  const [sidebarVisible, setSidebarVisible] = useState(true)

  useEffect(() => {
    loadThemes()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '\\') {
        e.preventDefault()
        setSidebarVisible(v => !v)
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
    </div>
  )
}
