import { useFilesStore } from '../../stores/files'
import { FileTreeItem } from './FileTreeItem'

export function FileTree() {
  const roots = useFilesStore(s => s.roots)
  const trees = useFilesStore(s => s.trees)
  const selectedFile = useFilesStore(s => s.selectedFile)

  if (roots.length === 0) {
    return (
      <div className="file-tree">
        <div style={{
          padding: '16px 12px',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          No folders open.<br />Click + to add a folder.
        </div>
      </div>
    )
  }

  return (
    <div className="file-tree">
      {roots.map(root => (
        <div key={root.id}>
          <div className="file-tree-section-label" title={root.path}>
            {root.name}
          </div>
          {(trees[root.id] ?? []).map(node => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              rootId={root.id}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
