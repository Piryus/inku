import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { PluginManifest } from '../../shared/plugin-types'

export function createPluginHandlers() {
  const builtinDir = path.join(app.getAppPath(), 'src', 'plugins')
  const userDir = path.join(app.getPath('home'), '.inku', 'plugins')
  const configPath = path.join(app.getPath('home'), '.inku', 'config.json')

  function getDisabledPlugins(): string[] {
    if (!fs.existsSync(configPath)) return []
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return config.disabledPlugins ?? []
  }

  function setDisabledPlugins(ids: string[]): void {
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    let config: Record<string, unknown> = {}
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
    config.disabledPlugins = ids
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  }

  return {
    'plugins:list': (): PluginManifest[] => {
      const disabled = getDisabledPlugins()
      const plugins: PluginManifest[] = []

      for (const [dir, builtin] of [[builtinDir, true], [userDir, false]] as const) {
        if (!fs.existsSync(dir)) continue
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue
          const manifestPath = path.join(dir, entry.name, 'manifest.json')
          if (!fs.existsSync(manifestPath)) continue

          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
          plugins.push({
            id: manifest.id ?? entry.name,
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            type: manifest.type ?? 'markdown-extension',
            builtin: builtin as boolean,
            enabled: !disabled.includes(manifest.id ?? entry.name),
            hooks: manifest.hooks ?? {},
          })
        }
      }
      return plugins
    },

    'plugins:toggle': (id: string, enabled: boolean): void => {
      const disabled = getDisabledPlugins()
      if (enabled) {
        setDisabledPlugins(disabled.filter(d => d !== id))
      } else {
        if (!disabled.includes(id)) {
          setDisabledPlugins([...disabled, id])
        }
      }
    },
  }
}
