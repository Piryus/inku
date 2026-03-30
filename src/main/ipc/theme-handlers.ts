import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { ThemeManifest } from '../../shared/theme-types'

export function createThemeHandlers() {
  const builtinDir = path.join(app.getAppPath(), 'themes')
  const userDir = path.join(app.getPath('home'), '.inku', 'themes')

  return {
    'themes:list': (): ThemeManifest[] => {
      const themes: ThemeManifest[] = []
      for (const dir of [builtinDir, userDir]) {
        if (!fs.existsSync(dir)) continue
        for (const file of fs.readdirSync(dir)) {
          if (!file.endsWith('.json')) continue
          const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
          themes.push({
            id: path.basename(file, '.json'),
            name: content.name,
            author: content.author,
            colors: content.colors,
          })
        }
      }
      return themes
    },

    'themes:set': (id: string): void => {
      const configPath = path.join(app.getPath('home'), '.inku', 'config.json')
      const dir = path.dirname(configPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      let config: Record<string, unknown> = {}
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      }
      config.theme = id
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    },
  }
}
