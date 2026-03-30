import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'path'
import { createDatabase } from './db/index'
import { registerHandlers, sendToRenderer } from './ipc/index'
import { createFsHandlers, closeAllWatchers } from './ipc/fs-handlers'
import { createSearchHandlers } from './ipc/search-handlers'
import { createTagHandlers } from './ipc/tag-handlers'
import { createThemeHandlers } from './ipc/theme-handlers'
import { createPluginHandlers } from './ipc/plugin-handlers'
import { watchRoot } from './watcher/index'
import type { WatcherCallbacks } from './watcher/index'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  const dbPath = path.join(app.getPath('userData'), 'inku.db')
  const db = createDatabase(dbPath)

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const watcherCallbacks: WatcherCallbacks = {
    onFileChange: (event) => {
      if (mainWindow) sendToRenderer(mainWindow, 'watch:file-changed', event)
    },
    onFileCreate: (event) => {
      if (mainWindow) sendToRenderer(mainWindow, 'watch:file-created', event)
    },
    onFileDelete: (event) => {
      if (mainWindow) sendToRenderer(mainWindow, 'watch:file-deleted', event)
    },
  }

  registerHandlers({
    ...createFsHandlers(db, watcherCallbacks),
    ...createSearchHandlers(db),
    ...createTagHandlers(db),
    ...createThemeHandlers(),
    ...createPluginHandlers(),
  })

  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Restore previously opened roots
  const roots = db.prepare('SELECT id, path FROM roots').all() as { id: string; path: string }[]
  for (const root of roots) {
    watchRoot(db, root.id, root.path, watcherCallbacks)
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    closeAllWatchers()
    db.close()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
