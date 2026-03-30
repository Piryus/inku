import { useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { useThemeStore } from './stores/theme'

export function App() {
  const { loadThemes } = useThemeStore()

  useEffect(() => {
    loadThemes()
  }, [])

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 14,
      }}>
        Open a file to start editing
      </div>
    </div>
  )
}
