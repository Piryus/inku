import { contextBridge, ipcRenderer } from 'electron'
import type { IpcInvokeChannels, IpcSendChannels } from '../shared/ipc-types'

type ChannelName = keyof IpcInvokeChannels
type SendChannelName = keyof IpcSendChannels

const electronAPI = {
  invoke: <C extends ChannelName>(
    channel: C,
    ...args: IpcInvokeChannels[C]['args']
  ): Promise<IpcInvokeChannels[C]['result']> => {
    return ipcRenderer.invoke(channel, ...args)
  },
  on: <C extends SendChannelName>(
    channel: C,
    callback: (data: IpcSendChannels[C]) => void
  ) => {
    const handler = (_event: Electron.IpcRendererEvent, data: IpcSendChannels[C]) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  showOpenDialog: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:open-folder')
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
