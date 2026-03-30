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

    const unsubChange = window.electronAPI.on('watch:file-changed', () => { loadTags() })
    const unsubCreate = window.electronAPI.on('watch:file-created', () => { loadRoots(); loadTags() })
    const unsubDelete = window.electronAPI.on('watch:file-deleted', () => { loadRoots(); loadTags() })

    return () => { unsubChange(); unsubCreate(); unsubDelete() }
  }, [])

  const handleOpenFolder = async () => {
    const folderPath = await window.electronAPI.showOpenDialog()
    if (folderPath) await addRoot(folderPath)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-brand">Inku</span>
        <button
          className="sidebar-add-btn"
          onClick={handleOpenFolder}
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
