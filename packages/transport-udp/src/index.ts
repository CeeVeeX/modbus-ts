import dgram from 'node:dgram'
import { ConnectionClosedError, TransportError, type Transport } from '@modbus-ts/core'

/**
 * UDP 传输配置。
 *
 * @example
 * ```ts
 * const options: UdpTransportOptions = { host: '192.168.1.10', port: 502 }
 * ```
 */
export interface UdpTransportOptions {
  host: string
  port: number
  bindAddress?: string
  bindPort?: number
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

/**
 * Modbus UDP 传输实现（Node.js）。
 *
 * @example
 * ```ts
 * const transport = new UdpTransport({ host: '127.0.0.1', port: 502 })
 * await transport.connect()
 * await transport.send(Uint8Array.from([0x01, 0x03]))
 * ```
 */
export class UdpTransport implements Transport {
  private socket: dgram.Socket | null = null
  private dataCallbacks: DataCallback[] = []
  private closeCallbacks: CloseCallback[] = []
  private connectCallbacks: ConnectCallback[] = []

  constructor(private readonly options: UdpTransportOptions) {}

  async connect(): Promise<void> {
    if (this.socket) {
      return
    }

    const socket = dgram.createSocket('udp4')
    socket.on('message', (msg) => {
      const data = new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength)
      this.dataCallbacks.forEach((cb) => cb(data))
    })
    socket.on('error', (err) => this.emitClose(new TransportError(err.message)))
    socket.on('close', () => {
      this.socket = null
      this.emitClose(new ConnectionClosedError())
    })

    await new Promise<void>((resolve, reject) => {
      socket.once('error', reject)
      socket.bind(this.options.bindPort ?? 0, this.options.bindAddress, () => {
        socket.off('error', reject)
        resolve()
      })
    })

    this.socket = socket
    this.connectCallbacks.forEach((cb) => cb())
  }

  async close(): Promise<void> {
    const socket = this.socket
    if (!socket) {
      return
    }

    this.socket = null
    await new Promise<void>((resolve) => {
      socket.once('close', () => resolve())
      socket.close()
    })
  }

  async send(data: Uint8Array): Promise<void> {
    const socket = this.socket
    if (!socket) {
      throw new ConnectionClosedError('udp socket is not connected')
    }

    await new Promise<void>((resolve, reject) => {
      socket.send(data, this.options.port, this.options.host, (err) => {
        if (err) {
          reject(new TransportError(err.message))
          return
        }
        resolve()
      })
    })
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
}
