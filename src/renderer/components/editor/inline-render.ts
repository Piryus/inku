import {
  ViewPlugin,
  DecorationSet,
  EditorView,
  Decoration,
  WidgetType,
} from '@codemirror/view'

class EmptyWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.style.display = 'none'
    return span
  }
}
import { RangeSetBuilder } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const { state } = view
  const cursorLine = state.doc.lineAt(state.selection.main.head).number

  syntaxTree(state).iterate({
    enter(node) {
      const { type, from, to } = node

      // Determine which line this node starts on
      const nodeLine = state.doc.lineAt(from).number

      // Skip decorating the line where the cursor lives (show raw markdown)
      if (nodeLine === cursorLine) return

      const name = type.name

      if (name === 'ATXHeading1' || name === 'ATXHeading2' || name === 'ATXHeading3') {
        const lineFrom = state.doc.lineAt(from).from
        const lineTo = state.doc.lineAt(to).to
        const cls =
          name === 'ATXHeading1'
            ? 'cm-md-heading-1'
            : name === 'ATXHeading2'
            ? 'cm-md-heading-2'
            : 'cm-md-heading-3'
        builder.add(lineFrom, lineFrom, Decoration.line({ class: cls }))
        return
      }

      if (name === 'HeaderMark') {
        // Hide the # marks in headings — but only if the heading line is not the cursor line
        // (already guarded above by checking nodeLine === cursorLine on the parent heading)
        builder.add(from, to + 1, Decoration.replace({}))
        return
      }

      if (name === 'StrongEmphasis') {
        builder.add(from, to, Decoration.mark({ class: 'cm-md-bold' }))
        return
      }

      if (name === 'EmphasisMark') {
        // Will be handled by parent — mark as syntax to hide
        builder.add(from, to, Decoration.mark({ class: 'cm-md-syntax' }))
        return
      }

      if (name === 'Emphasis') {
        builder.add(from, to, Decoration.mark({ class: 'cm-md-italic' }))
        return
      }

      if (name === 'InlineCode') {
        builder.add(from, to, Decoration.mark({ class: 'cm-md-code' }))
        return
      }

      if (name === 'CodeMark') {
        builder.add(from, to, Decoration.mark({ class: 'cm-md-syntax' }))
        return
      }

      if (name === 'Link') {
        // Replace the entire link [text](url) — we'll show only the link text styled
        // Find the label content: between [ and ]
        const text = state.sliceDoc(from, to)
        const labelMatch = text.match(/^\[([^\]]*)\]/)
        if (labelMatch) {
          const labelEnd = from + labelMatch[0].length
          // Hide opening bracket
          builder.add(from, from + 1, Decoration.replace({}))
          // Style the label text
          builder.add(from + 1, labelEnd - 1, Decoration.mark({ class: 'cm-md-link' }))
          // Hide closing bracket and (url) part
          builder.add(labelEnd - 1, to, Decoration.replace({}))
        }
        return
      }

      if (name === 'Blockquote') {
        const lineFrom = state.doc.lineAt(from).from
        builder.add(lineFrom, lineFrom, Decoration.line({ class: 'cm-md-blockquote' }))
        return
      }

      if (name === 'FencedCode') {
        // Apply background to every line in the code block
        const startLine = state.doc.lineAt(from)
        const endLine = state.doc.lineAt(to)

        for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
          const line = state.doc.line(lineNum)
          const lineText = line.text

          if (lineNum === startLine.number) {
            // Opening ``` line
            builder.add(line.from, line.from, Decoration.line({ class: 'cm-md-codeblock cm-md-codeblock-start' }))
            if (nodeLine !== cursorLine) {
              // Hide the ``` fence but show language label if present
              const langMatch = lineText.match(/^```(\w+)/)
              if (langMatch) {
                builder.add(line.from, line.from + 3, Decoration.replace({}))
                builder.add(line.from + 3, line.to, Decoration.mark({ class: 'cm-md-codeblock-lang' }))
              } else {
                builder.add(line.from, line.to, Decoration.replace({ widget: new EmptyWidget() }))
              }
            }
          } else if (lineNum === endLine.number) {
            // Closing ``` line
            builder.add(line.from, line.from, Decoration.line({ class: 'cm-md-codeblock cm-md-codeblock-end' }))
            if (nodeLine !== cursorLine) {
              builder.add(line.from, line.to, Decoration.replace({ widget: new EmptyWidget() }))
            }
          } else {
            // Content lines
            builder.add(line.from, line.from, Decoration.line({ class: 'cm-md-codeblock' }))
          }
        }
        return false // don't recurse into children
      }
    },
  })

  return builder.finish()
}

export const inlineRenderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: any) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)
