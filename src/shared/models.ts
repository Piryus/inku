export interface Root {
  id: string
  path: string
  name: string
  addedAt: number
}

export interface FileEntry {
  id: string
  rootId: string
  relativePath: string
  absolutePath: string
  name: string
  title: string | null
  modifiedAt: number
  size: number
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

export interface Tag {
  name: string
  count: number
}

export interface SearchResult {
  file: FileEntry
  matches: SearchMatch[]
}

export interface SearchMatch {
  line: number
  column: number
  text: string
  highlight: [number, number]
}
