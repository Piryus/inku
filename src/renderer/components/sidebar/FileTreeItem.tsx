import { useState } from 'react'
import type { TreeNode, FileEntry } from '@shared/models'
import { useEditorStore } from '../../stores/editor'
import { useFilesStore } from '../../stores/files'

interface FileTreeItemProps {
  node: TreeNode
  depth?: number
  rootId: string
  selectedFile: FileEntry | null
}

export function FileTreeItem({ node, depth = 0, rootId, selectedFile }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(true)
  const openFile = useEditorStore(s => s.openFile)
  const selectFile = useFilesStore(s => s.selectFile)

  const paddingLeft = 12 + depth * 14

  const handleClick = () => {
    if (node.type === 'directory') {
      setExpanded(prev => !prev)
    } else {
      // Build a minimal FileEntry to pass to selectFile
      const fileEntry: FileEntry = {
        id: node.path,
        rootId,
        relativePath: node.path,
        absolutePath: node.path,
        name: node.name,
        title: null,
        modifiedAt: 0,
        size: 0,
      }
      selectFile(fileEntry)
      openFile(node.path, node.name)
    }
  }

  const isSelected =
    node.type === 'file' &&
    selectedFile !== null &&
    selectedFile.absolutePath === node.path

  const icon =
    node.type === 'directory'
      ? expanded
        ? '▾'
        : '▸'
      : '○'

  return (
    <div>
      <div
        className={`file-tree-item${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft }}
        onClick={handleClick}
        title={node.name}
      >
        <span className="file-tree-item-icon">{icon}</span>
        <span className="file-tree-item-name">{node.name}</span>
      </div>
      {node.type === 'directory' && expanded && node.children && (
        <div className="file-tree-children">
          {node.children.map(child => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              rootId={rootId}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}
