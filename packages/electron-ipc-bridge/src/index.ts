import { TransportError } from '@modbus-ts/core'
import type { IpcMain, IpcRenderer, WebContents } from 'electron'

export interface ElectronIpcBridge {
  invoke(channel: string, payload?: unknown): Promise<unknown>
  on(channel: string, listener: (...args: unknown[]) => void): void
  off?(channel: string, listener: (...args: unknown[]) => void): void
  removeListener?(channel: string, listener: (...args: unknown[]) => void): void
}

export type ElectronIpcRendererLike = Pick<IpcRenderer, 'invoke' | 'on' | 'off' | 'removeListener'>

export type ElectronIpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>
export type ElectronWebContentsLike = Pick<WebContents, 'send'>

export interface MainBridgeChannels {
  connectChannel: string
  closeChannel: string
  sendChannel: string
  dataEventChannel: string
  closeEventChannel: string
}

export interface ElectronMainBridgeOptions {
  ipcMain: ElectronIpcMainLike
  webContents?: ElectronWebContentsLike
  emitToRenderer?: (channel: string, payload?: unknown) => void
  onConnect: () => Promise<void> | void
  onSend: (frame: Uint8Array) => Promise<void> | void
  onClose: () => Promise<void> | void
  channels?: Partial<MainBridgeChannels>
}

export interface ElectronMainBridge {
  emitData(frame: Uint8Array): void
  emitClosed(payload?: unknown): void
  dispose(): void
}

function toUint8Array(payload: unknown): Uint8Array {
  if (payload instanceof Uint8Array) {
    return payload
  }
  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload)
  }
  if (Array.isArray(payload)) {
    return Uint8Array.from(payload)
  }
  throw new TransportError('invalid ipc payload type')
}

function resolveChannels(channels?: Partial<MainBridgeChannels>): MainBridgeChannels {
  return {
    connectChannel: channels?.connectChannel ?? 'modbus:connect',
    closeChannel: channels?.closeChannel ?? 'modbus:close',
    sendChannel: channels?.sendChannel ?? 'modbus:send',
    dataEventChannel: channels?.dataEventChannel ?? 'modbus:data',
    closeEventChannel: channels?.closeEventChannel ?? 'modbus:closed',
  }
}

function resolveEmitToRenderer(
  options: ElectronMainBridgeOptions,
): (channel: string, payload?: unknown) => void {
  if (options.emitToRenderer) {
    return options.emitToRenderer
  }
  if (options.webContents) {
    return (channel: string, payload?: unknown) => {
      options.webContents?.send(channel, payload)
    }
  }
  throw new TransportError('either emitToRenderer or webContents must be provided')
}

export function createElectronRendererBridge(ipc: ElectronIpcRendererLike): ElectronIpcBridge {
  return {
    invoke: (channel, payload) => ipc.invoke(channel, payload),
    on: (channel, listener) => {
      ipc.on(channel, listener as unknown as Parameters<ElectronIpcRendererLike['on']>[1])
    },
    off: (channel, listener) => {
      ipc.off?.(channel, listener as unknown as Parameters<ElectronIpcRendererLike['off']>[1])
    },
    removeListener: (channel, listener) => {
      ipc.removeListener?.(
        channel,
        listener as unknown as Parameters<ElectronIpcRendererLike['removeListener']>[1],
      )
    },
  }
}

export function createElectronMainBridge(options: ElectronMainBridgeOptions): ElectronMainBridge {
  const channels = resolveChannels(options.channels)
  const emitToRenderer = resolveEmitToRenderer(options)

  options.ipcMain.handle(channels.connectChannel, async () => {
    await options.onConnect()
  })

  options.ipcMain.handle(channels.sendChannel, async (_event, payload) => {
    await options.onSend(toUint8Array(payload))
  })

  options.ipcMain.handle(channels.closeChannel, async () => {
    await options.onClose()
  })

  return {
    emitData(frame: Uint8Array): void {
      emitToRenderer(channels.dataEventChannel, frame)
    },
    emitClosed(payload?: unknown): void {
      emitToRenderer(channels.closeEventChannel, payload)
    },
    dispose(): void {
      options.ipcMain.removeHandler?.(channels.connectChannel)
      options.ipcMain.removeHandler?.(channels.sendChannel)
      options.ipcMain.removeHandler?.(channels.closeChannel)
    },
  }
}
