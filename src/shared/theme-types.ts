export interface ThemeColors {
  'bg-primary': string
  'bg-secondary': string
  'bg-surface': string
  'border': string
  'text-primary': string
  'text-secondary': string
  'text-muted': string
  'accent': string
  'accent-strong': string
  'accent-muted': string
  'success': string
  'warning': string
  'error': string
}

export interface ThemeManifest {
  id: string
  name: string
  author: string
  colors: ThemeColors
}
