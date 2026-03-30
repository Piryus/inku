import type { ThemeColors } from '@shared/theme-types'

let styleElement: HTMLStyleElement | null = null

export function tokensToCssVars(colors: ThemeColors): string {
  const vars = Object.entries(colors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n')
  return `:root {\n${vars}\n}`
}

export function applyTheme(colors: ThemeColors): void {
  const css = tokensToCssVars(colors)

  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'inku-theme'
    document.head.appendChild(styleElement)
  }

  styleElement.textContent = css
}
