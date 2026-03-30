import { useEffect } from 'react'
import { useThemeStore } from '../../stores/theme'
import { usePluginsStore } from '../../stores/plugins'
import './settings.css'

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const themes = useThemeStore(s => s.themes)
  const activeThemeId = useThemeStore(s => s.activeThemeId)
  const setTheme = useThemeStore(s => s.setTheme)

  const plugins = usePluginsStore(s => s.plugins)
  const loadPlugins = usePluginsStore(s => s.loadPlugins)
  const togglePlugin = usePluginsStore(s => s.togglePlugin)

  useEffect(() => {
    loadPlugins()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button className="settings-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="settings-body">
          {/* Theme section */}
          <section className="settings-section">
            <div className="settings-section-title">Theme</div>
            <div className="settings-theme-grid">
              {themes.map(theme => (
                <button
                  key={theme.id}
                  className={`settings-theme-card${theme.id === activeThemeId ? ' active' : ''}`}
                  onClick={() => setTheme(theme.id)}
                  title={theme.name}
                >
                  <div className="settings-theme-preview">
                    <div
                      className="settings-theme-bar"
                      style={{ background: theme.colors['bg-secondary'] }}
                    />
                    <div
                      className="settings-theme-bar"
                      style={{ background: theme.colors['bg-primary'] }}
                    />
                    <div
                      className="settings-theme-bar"
                      style={{ background: theme.colors['accent'] }}
                    />
                  </div>
                  <div className="settings-theme-name">{theme.name}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Plugins section */}
          <section className="settings-section">
            <div className="settings-section-title">Plugins</div>
            <div className="settings-plugin-list">
              {plugins.map(plugin => (
                <div key={plugin.id} className="settings-plugin-row">
                  <div className="settings-plugin-info">
                    <div className="settings-plugin-name">{plugin.name}</div>
                    <div className="settings-plugin-description">{plugin.description}</div>
                  </div>
                  <label className="settings-toggle" title={plugin.enabled ? 'Disable' : 'Enable'}>
                    <input
                      type="checkbox"
                      checked={plugin.enabled}
                      onChange={e => togglePlugin(plugin.id, e.target.checked)}
                    />
                    <span className="settings-toggle-track" />
                    <span className="settings-toggle-thumb" />
                  </label>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
