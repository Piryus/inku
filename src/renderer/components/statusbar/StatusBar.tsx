import { useMemo } from 'react'
import { useEditorStore } from '../../stores/editor'
import './statusbar.css'

export function StatusBar() {
  const { tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)

  const stats = useMemo(() => {
    if (!activeTab) return null
    const words = activeTab.content.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.ceil(words / 200))
    const lines = activeTab.content.split('\n').length
    return { words, readingTime, lines }
  }, [activeTab?.content])

  if (!activeTab || !stats) return null

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span>{stats.lines} lines</span>
      </div>
      <div className="status-bar-right">
        <span>{stats.words} words</span>
        <span>{stats.readingTime} min read</span>
      </div>
    </div>
  )
}
