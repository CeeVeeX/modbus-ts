import { ConnectionClosedError, TransportError, type Transport } from '@modbus-ts/core'
import type { ElectronIpcBridge } from '@modbus-ts/electron-ipc-bridge'
export {
  createElectronMainBridge,
  createElectronRendererBridge,
  type ElectronIpcBridge,
  type ElectronIpcMainLike,
  type ElectronIpcRendererLike,
  type ElectronMainBridge,
  type ElectronMainBridgeOptions,
  type MainBridgeChannels,
} from '@modbus-ts/electron-ipc-bridge'

/**
 * Electron IPC 传输配置。
 *
 * @example
 * ```ts
 * const options: ElectronIpcTransportOptions = { ipc: bridge }
 * ```
 */
export interface ElectronIpcTransportOptions {
  ipc: ElectronIpcBridge
  connectChannel?: string
  closeChannel?: string
  sendChannel?: string
  dataEventChannel?: string
  closeEventChannel?: string
}

/**
 * 接收数据回调类型。
 * @example
 * ```ts
 * const onData: DataCallback = (data) => console.log(data.length)
 * ```
 */
export type DataCallback = (data: Uint8Array) => void
/**
 * 关闭回调类型。
 * @example
 * ```ts
 * const onClose: CloseCallback = (err) => console.log(err?.message)
 * ```
 */
export type CloseCallback = (err?: Error) => void
/**
 * 连接回调类型。
 * @example
 * ```ts
 * const onConnect: ConnectCallback = () => console.log('connected')
 * ```
 */
export type ConnectCallback = () => void

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

function toCloseError(payload: unknown): Error | undefined {
  if (!payload) {
    return new ConnectionClosedError()
  }
  if (payload instanceof Error) {
    return payload
  }
  if (typeof payload === 'string') {
    return new ConnectionClosedError(payload)
  }
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = String((payload as { message?: unknown }).message ?? 'connection closed')
    return new ConnectionClosedError(message)
  }
  return new ConnectionClosedError()
}

/**
 * Electron IPC 传输实现。
 *
 * @example
 * ```ts
 * const transport = new ElectronIpcTransport({ ipc: bridge })
 * await transport.connect()
 * await transport.send(Uint8Array.from([1, 2, 3]))
 * ```
 */
export class ElectronIpcTransport implements Transport {
  private dataCallbacks: DataCallback[] = []
  private closeCallbacks: CloseCallback[] = []
  private connectCallbacks: ConnectCallback[] = []
  private connected = false
  private listenersAttached = false

  private readonly connectChannel: string
  private readonly closeChannel: string
  private readonly sendChannel: string
  private readonly dataEventChannel: string
  private readonly closeEventChannel: string

  private readonly handleDataEvent = (...args: unknown[]): void => {
    const payload = args.length > 0 ? args[args.length - 1] : undefined
    try {
      const frame = toUint8Array(payload)
      this.dataCallbacks.forEach((cb) => cb(frame))
    } catch (error) {
      this.emitClose(error as Error)
    }
  }

  private readonly handleCloseEvent = (...args: unknown[]): void => {
    this.connected = false
    const payload = args.length > 0 ? args[args.length - 1] : undefined
    this.emitClose(toCloseError(payload))
  }

  constructor(private readonly options: ElectronIpcTransportOptions) {
    this.connectChannel = options.connectChannel ?? 'modbus:connect'
    this.closeChannel = options.closeChannel ?? 'modbus:close'
    this.sendChannel = options.sendChannel ?? 'modbus:send'
    this.dataEventChannel = options.dataEventChannel ?? 'modbus:data'
    this.closeEventChannel = options.closeEventChannel ?? 'modbus:closed'
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    this.attachListeners()
    try {
      await this.options.ipc.invoke(this.connectChannel)
      this.connected = true
      this.connectCallbacks.forEach((cb) => cb())
    } catch (error) {
      this.connected = false
      throw new TransportError((error as Error)?.message ?? 'ipc connect failed')
    }
  }

  async close(): Promise<void> {
    if (!this.connected) {
      this.detachListeners()
      return
    }

    this.connected = false
    this.detachListeners()

    try {
      await this.options.ipc.invoke(this.closeChannel)
    } catch (error) {
      throw new TransportError((error as Error)?.message ?? 'ipc close failed')
    }
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.connected) {
      throw new ConnectionClosedError('electron ipc transport is not connected')
    }

    try {
      await this.options.ipc.invoke(this.sendChannel, data)
    } catch (error) {
      throw new TransportError((error as Error)?.message ?? 'ipc send failed')
    }
  }

  onData(cb: (data: Uint8Array) => void): void {
    this.dataCallbacks.push(cb)
  }

  onClose(cb: (err?: Error) => void): void {
    this.closeCallbacks.push(cb)
  }

  onConnect(cb: ConnectCallback): void {
    this.connectCallbacks.push(cb)
  }

  private emitClose(err?: Error): void {
    this.closeCallbacks.forEach((cb) => cb(err))
  }

  private attachListeners(): void {
    if (this.listenersAttached) {
      return
    }
    this.options.ipc.on(this.dataEventChannel, this.handleDataEvent)
    this.options.ipc.on(this.closeEventChannel, this.handleCloseEvent)
    this.listenersAttached = true
  }

  private detachListeners(): void {
    if (!this.listenersAttached) {
      return
    }
    if (this.options.ipc.off) {
      this.options.ipc.off(this.dataEventChannel, this.handleDataEvent)
      this.options.ipc.off(this.closeEventChannel, this.handleCloseEvent)
    } else if (this.options.ipc.removeListener) {
      this.options.ipc.removeListener(this.dataEventChannel, this.handleDataEvent)
      this.options.ipc.removeListener(this.closeEventChannel, this.handleCloseEvent)
    }
    this.listenersAttached = false
  }
}
