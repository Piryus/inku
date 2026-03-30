import { useEffect, useRef, useState } from 'react'
import { useSearchStore } from '../../stores/search'
import { useEditorStore } from '../../stores/editor'
import './command-palette.css'

interface Command {
  id: string
  label: string
  shortcut?: string[]
  action: () => void
}

interface CommandPaletteProps {
  mode: 'files' | 'commands'
  onClose: () => void
}

const STATIC_COMMANDS: Omit<Command, 'action'>[] = [
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', shortcut: ['⌘', '\\'] },
  { id: 'open-files', label: 'Go to File…', shortcut: ['⌘', 'P'] },
  { id: 'open-commands', label: 'Show All Commands', shortcut: ['⌘', '⇧', 'P'] },
  { id: 'open-settings', label: 'Open Settings', shortcut: ['⌘', ','] },
  { id: 'close-tab', label: 'Close Current Tab', shortcut: ['⌘', 'W'] },
  { id: 'save-file', label: 'Save File', shortcut: ['⌘', 'S'] },
  { id: 'new-file', label: 'New File', shortcut: ['⌘', 'N'] },
]

export function CommandPalette({ mode, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  const fileResults = useSearchStore(s => s.fileResults)
  const searchFiles = useSearchStore(s => s.searchFiles)
  const clearSearch = useSearchStore(s => s.clear)
  const openFile = useEditorStore(s => s.openFile)

  // Auto-focus input when palette opens
  useEffect(() => {
    inputRef.current?.focus()
    return () => clearSearch()
  }, [])

  // Search files when query changes in file mode
  useEffect(() => {
    if (mode === 'files') {
      searchFiles(query)
    }
    setSelectedIndex(0)
  }, [query, mode])

  // Filtered commands for commands mode
  const filteredCommands: Command[] = STATIC_COMMANDS
    .filter(cmd => cmd.label.toLowerCase().includes(query.toLowerCase()))
    .map(cmd => ({
      ...cmd,
      action: () => {
        // Commands are informational in the palette; keyboard shortcuts handle actual execution.
        // Dispatching a synthetic keydown for structural commands is fragile, so we close
        // and let the existing global handlers react.  Callers can extend this as needed.
        onClose()
      },
    }))

  const itemCount = mode === 'files' ? fileResults.length : filteredCommands.length

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % Math.max(itemCount, 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + Math.max(itemCount, 1)) % Math.max(itemCount, 1))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(selectedIndex)
    }
  }

  const handleSelect = (index: number) => {
    if (mode === 'files') {
      const file = fileResults[index]
      if (file) {
        openFile(file.absolutePath, file.name)
        onClose()
      }
    } else {
      const cmd = filteredCommands[index]
      if (cmd) {
        cmd.action()
      }
    }
  }

  const placeholder = mode === 'files' ? 'Search files…' : 'Search commands…'

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input-row">
          <span className="command-palette-icon">
            {mode === 'files' ? '⌕' : '>'}
          </span>
          <input
            ref={inputRef}
            className="command-palette-input"
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
          <span className="command-palette-mode-badge">
            {mode === 'files' ? 'Files' : 'Commands'}
          </span>
        </div>

        <div className="command-palette-results">
          {mode === 'files' && (
            fileResults.length === 0
              ? <div className="command-palette-empty">
                  {query.trim() ? 'No files found' : 'Type to search files'}
                </div>
              : fileResults.map((file, i) => (
                  <div
                    key={file.id}
                    className={`command-palette-item${i === selectedIndex ? ' selected' : ''}`}
                    onClick={() => handleSelect(i)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <span className="command-palette-item-icon">📄</span>
                    <span className="command-palette-item-label">{file.name}</span>
                    <span className="command-palette-item-sub">{file.relativePath}</span>
                  </div>
                ))
          )}

          {mode === 'commands' && (
            filteredCommands.length === 0
              ? <div className="command-palette-empty">No commands found</div>
              : filteredCommands.map((cmd, i) => (
                  <div
                    key={cmd.id}
                    className={`command-palette-item${i === selectedIndex ? ' selected' : ''}`}
                    onClick={() => handleSelect(i)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <span className="command-palette-item-icon">⚡</span>
                    <span className="command-palette-item-label">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="command-palette-shortcut">
                        {cmd.shortcut.map((key, ki) => (
                          <kbd key={ki} className="command-palette-key">{key}</kbd>
                        ))}
                      </span>
                    )}
                  </div>
                ))
          )}
        </div>
      </div>
    </div>
  )
}
