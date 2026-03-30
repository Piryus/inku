export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  type: 'markdown-extension'
  builtin: boolean
  enabled: boolean
  hooks: {
    remarkPlugin?: boolean
    codemirrorExtension?: boolean
  }
}
