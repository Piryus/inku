import { ipcMain, BrowserWindow } from 'electron'
import type { IpcInvokeChannels, IpcSendChannel, IpcSendChannels } from '../../shared/ipc-types'

type HandlerMap = {
  [K in keyof IpcInvokeChannels]: (...args: IpcInvokeChannels[K]['args']) => IpcInvokeChannels[K]['result'] | Promise<IpcInvokeChannels[K]['result']>
}

export function registerHandlers(handlers: Partial<HandlerMap>): void {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (_event, ...args) => {
      return (handler as Function)(...args)
    })
  }
}

export function sendToRenderer<C extends IpcSendChannel>(
  win: BrowserWindow,
  channel: C,
  data: IpcSendChannels[C]
): void {
  win.webContents.send(channel, data)
}
