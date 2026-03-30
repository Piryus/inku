import { useEffect } from 'react'
import { useFilesStore } from '../../stores/files'
import { useTagsStore } from '../../stores/tags'
import { SearchBar } from './SearchBar'
import { FileTree } from './FileTree'
import { TagPanel } from './TagPanel'
import './sidebar.css'

export function Sidebar() {
  const loadRoots = useFilesStore(s => s.loadRoots)
  const addRoot = useFilesStore(s => s.addRoot)
  const loadTags = useTagsStore(s => s.loadTags)

  useEffect(() => {
    loadRoots()
    loadTags()
  }, [])

  const handleAddFolder = async () => {
    // showOpenDialog is wired in Task 12 — use optional chaining until then
    const api = window.electronAPI as typeof window.electronAPI & {
      showOpenDialog?: () => Promise<{ canceled: boolean; filePaths: string[] }>
    }
    const result = await api.showOpenDialog?.()
    if (result && !result.canceled && result.filePaths.length > 0) {
      await addRoot(result.filePaths[0])
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-brand">Inku</span>
        <button
          className="sidebar-add-btn"
          onClick={handleAddFolder}
          title="Open folder"
        >
          +
        </button>
      </div>
      <div className="sidebar-body">
        <SearchBar />
        <FileTree />
        <TagPanel />
      </div>
    </aside>
  )
}
