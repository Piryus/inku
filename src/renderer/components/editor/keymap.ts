import { keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import type { KeyBinding } from '@codemirror/view'

export function createInkuKeymap(callbacks: {
  onSave: () => void
}) {
  const inkuBindings: KeyBinding[] = [
    {
      key: 'Mod-s',
      run: () => { callbacks.onSave(); return true },
    },
    {
      key: 'Mod-b',
      run: (view) => { wrapSelection(view, '**', '**'); return true },
    },
    {
      key: 'Mod-i',
      run: (view) => { wrapSelection(view, '*', '*'); return true },
    },
    {
      key: 'Mod-k',
      run: (view) => {
        const { from, to } = view.state.selection.main
        const selected = view.state.sliceDoc(from, to)
        const replacement = `[${selected}](url)`
        view.dispatch({
          changes: { from, to, insert: replacement },
          selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 },
        })
        return true
      },
    },
  ]
  return keymap.of([...inkuBindings, indentWithTab, ...defaultKeymap])
}

function wrapSelection(view: any, before: string, after: string) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: to + before.length },
  })
}
