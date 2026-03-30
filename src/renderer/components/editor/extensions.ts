import { EditorView } from '@codemirror/view'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { createInkuKeymap } from './keymap'
import { inlineRenderPlugin } from './inline-render'

const inkuTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
  },
  '.cm-content': {
    caretColor: 'var(--color-accent)',
    fontFamily: 'var(--font-ui)',
    fontSize: '15px',
    lineHeight: '1.7',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--color-accent-muted)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-accent)',
    borderLeftWidth: '2px',
  },
})

export function createExtensions(callbacks: {
  onSave: () => void
  onChange: (content: string) => void
}) {
  return [
    inkuTheme,
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    createInkuKeymap({ onSave: callbacks.onSave }),
    inlineRenderPlugin,
    EditorView.updateListener.of(update => {
      if (update.docChanged) {
        callbacks.onChange(update.state.doc.toString())
      }
    }),
    EditorView.lineWrapping,
  ]
}
