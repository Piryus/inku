import { useEffect, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { useEditorStore } from '../../stores/editor'
import { createExtensions } from './extensions'
import './editor.css'

export function Editor() {
  const { tabs, activeTabId, updateContent, saveTab } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Destroy previous view
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    if (!activeTab) return

    const tabId = activeTab.id

    const onSave = () => {
      saveTab(tabId)
    }

    const onChange = (content: string) => {
      updateContent(tabId, content)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTab(tabId)
      }, 300)
    }

    const state = EditorState.create({
      doc: activeTab.content,
      extensions: createExtensions({ onSave, onChange }),
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      view.destroy()
      viewRef.current = null
    }
  }, [activeTabId])

  if (!activeTab) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 14,
      }}>
        Open a file to start editing
      </div>
    )
  }

  return (
    <div className="editor-container">
      <div className="editor-breadcrumb">
        {activeTab.filePath}
      </div>
      <div className="editor-wrapper" ref={containerRef} />
    </div>
  )
}
