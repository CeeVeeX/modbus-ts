import { TransportError } from '@modbus-ts/core'
import type { IpcMain, IpcRenderer, WebContents } from 'electron'

/**
 * 渲染进程侧桥接接口（面向 transport 层）。
 *
 * @example
 * ```ts
 * bridge.on('modbus:data', (_event, payload) => console.log(payload))
 * ```
 */
export interface ElectronIpcBridge {
  invoke(channel: string, payload?: unknown): Promise<unknown>
  on(channel: string, listener: (...args: unknown[]) => void): void
  off?(channel: string, listener: (...args: unknown[]) => void): void
  removeListener?(channel: string, listener: (...args: unknown[]) => void): void
}

/**
 * Electron `ipcRenderer` 的最小能力约束。
 * @example
 * ```ts
 * const rendererLike: ElectronIpcRendererLike = ipcRenderer
 * ```
 */
export type ElectronIpcRendererLike = Pick<IpcRenderer, 'invoke' | 'on' | 'off' | 'removeListener'>

/**
 * Electron `ipcMain` 的最小能力约束。
 * @example
 * ```ts
 * const mainLike: ElectronIpcMainLike = ipcMain
 * ```
 */
export type ElectronIpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>
/**
 * Electron `webContents` 的最小能力约束。
 * @example
 * ```ts
 * const wcLike: ElectronWebContentsLike = webContents
 * ```
 */
export type ElectronWebContentsLike = Pick<WebContents, 'send'>

/**
 * 主进程与渲染进程通讯通道名。
 *
 * @example
 * ```ts
 * const channels: MainBridgeChannels = {
 *   connectChannel: 'modbus:connect',
 *   closeChannel: 'modbus:close',
 *   sendChannel: 'modbus:send',
 *   dataEventChannel: 'modbus:data',
 *   closeEventChannel: 'modbus:closed',
 * }
 * ```
 */
export interface MainBridgeChannels {
  connectChannel: string
  closeChannel: string
  sendChannel: string
  dataEventChannel: string
  closeEventChannel: string
}

/**
 * 主进程桥接初始化参数。
 *
 * @example
 * ```ts
 * const options: ElectronMainBridgeOptions = {
 *   ipcMain,
 *   webContents,
 *   onConnect: async () => {},
 *   onSend: async () => {},
 *   onClose: async () => {},
 * }
 * ```
 */
export interface ElectronMainBridgeOptions {
  ipcMain: ElectronIpcMainLike
  webContents?: ElectronWebContentsLike
  emitToRenderer?: (channel: string, payload?: unknown) => void
  onConnect: () => Promise<void> | void
  onSend: (frame: Uint8Array) => Promise<void> | void
  onClose: () => Promise<void> | void
  channels?: Partial<MainBridgeChannels>
}

/**
 * 主进程桥接对象，用于向渲染进程推送数据与关闭事件。
 *
 * @example
 * ```ts
 * mainBridge.emitData(Uint8Array.from([1, 2, 3]))
 * ```
 */
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

/**
 * 创建渲染进程桥接对象。
 *
 * @example
 * ```ts
 * const bridge = createElectronRendererBridge(ipcRenderer)
 * ```
 */
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

/**
 * 创建主进程桥接对象并注册 IPC handler。
 *
 * @example
 * ```ts
 * const bridge = createElectronMainBridge({ ipcMain, webContents, onConnect, onSend, onClose })
 * ```
 */
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
