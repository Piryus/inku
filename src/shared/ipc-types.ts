import type { Root, FileEntry, TreeNode, Tag, SearchResult } from './models'
import type { PluginManifest } from './plugin-types'
import type { ThemeManifest } from './theme-types'

export type SearchOpts = {
  rootId?: string
  tag?: string
  maxResults?: number
}

export type FileChangeEvent = {
  type: 'change' | 'add' | 'unlink'
  path: string
  rootId: string
}

export type IpcInvokeChannels = {
  'fs:list-roots': { args: []; result: Root[] }
  'fs:add-root': { args: [path: string]; result: Root }
  'fs:remove-root': { args: [rootId: string]; result: void }
  'fs:read-file': { args: [path: string]; result: string }
  'fs:write-file': { args: [path: string, content: string]; result: void }
  'fs:create-file': { args: [rootId: string, relativePath: string]; result: FileEntry }
  'fs:delete-file': { args: [path: string]; result: void }
  'fs:move-file': { args: [from: string, to: string]; result: void }
  'fs:list-tree': { args: [rootId: string]; result: TreeNode[] }
  'search:files': { args: [query: string]; result: FileEntry[] }
  'search:content': { args: [query: string, opts?: SearchOpts]; result: SearchResult[] }
  'tags:list': { args: []; result: Tag[] }
  'tags:files-by-tag': { args: [tag: string]; result: FileEntry[] }
  'plugins:list': { args: []; result: PluginManifest[] }
  'plugins:toggle': { args: [id: string, enabled: boolean]; result: void }
  'themes:list': { args: []; result: ThemeManifest[] }
  'themes:set': { args: [id: string]; result: void }
}

export type IpcSendChannels = {
  'watch:file-changed': FileChangeEvent
  'watch:file-created': FileChangeEvent
  'watch:file-deleted': FileChangeEvent
}

export type IpcChannel = keyof IpcInvokeChannels
export type IpcSendChannel = keyof IpcSendChannels
