import { describe, it, expect } from 'vitest'
import { tokensToCssVars } from '../../../src/renderer/themes/loader'
import type { ThemeColors } from '../../../src/shared/theme-types'

const testColors: ThemeColors = {
  'bg-primary': '#000000',
  'bg-secondary': '#111111',
  'bg-surface': '#222222',
  'border': '#333333',
  'text-primary': '#ffffff',
  'text-secondary': '#cccccc',
  'text-muted': '#999999',
  'accent': '#ff0000',
  'accent-strong': '#cc0000',
  'accent-muted': '#330000',
  'success': '#00ff00',
  'warning': '#ffff00',
  'error': '#ff0000',
}

describe('Theme Loader', () => {
  it('converts tokens to CSS variable declarations', () => {
    const vars = tokensToCssVars(testColors)
    expect(vars).toContain('--color-bg-primary: #000000')
    expect(vars).toContain('--color-accent: #ff0000')
    expect(vars).toContain('--color-text-primary: #ffffff')
  })

  it('produces a valid CSS string for :root', () => {
    const css = tokensToCssVars(testColors)
    expect(css.startsWith(':root {')).toBe(true)
    expect(css.endsWith('}')).toBe(true)
  })
})
