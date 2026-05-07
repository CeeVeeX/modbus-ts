import net from 'node:net'
import { ConnectionClosedError, TransportError, type Transport } from '@modbus-ts/core'

export interface TcpTransportOptions {
  host: string
  port: number
  connectTimeoutMs?: number
  reconnectDelayMs?: number
  maxReconnectDelayMs?: number
}

export type DataCallback = (data: Uint8Array) => void
export type CloseCallback = (err?: Error) => void
export type ConnectCallback = () => void

export class TcpTransport implements Transport {
  private socket: net.Socket | null = null
  private dataCallbacks: DataCallback[] = []
  private closeCallbacks: CloseCallback[] = []
  private connectCallbacks: ConnectCallback[] = []
  private receiveBuffer = Buffer.alloc(0)
  private manualClose = false
  private reconnectDelay: number
  private reconnectTimer: NodeJS.Timeout | null = null
  private connecting = false

  constructor(private readonly options: TcpTransportOptions) {
    this.reconnectDelay = options.reconnectDelayMs ?? 300
  }

  async connect(): Promise<void> {
    if (this.connecting || this.socket) {
      return
    }

    this.connecting = true
    this.manualClose = false
    await this.openSocket()
    this.connecting = false
  }

  async close(): Promise<void> {
    this.manualClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket) {
      const socket = this.socket
      this.socket = null
      await new Promise<void>((resolve) => {
        socket.once('close', () => resolve())
        socket.end()
        socket.destroy()
      })
    }
  }

  async send(data: Uint8Array): Promise<void> {
    const socket = this.socket
    if (!socket || socket.destroyed) {
      throw new ConnectionClosedError('socket is not connected')
    }

    await new Promise<void>((resolve, reject) => {
      socket.write(data, (err) => {
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

  private async openSocket(): Promise<void> {
    const { host, port, connectTimeoutMs = 5000 } = this.options
    const socket = new net.Socket()

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const done = (err?: Error) => {
        if (settled) {
          return
        }
        settled = true
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }

      socket.setNoDelay(true)
      socket.setTimeout(connectTimeoutMs, () => done(new TransportError('connect timeout')))
      socket.once('error', (err) => done(new TransportError(err.message)))
      socket.connect(port, host, () => {
        socket.setTimeout(0)
        done()
      })
    })

    socket.on('data', (chunk) => this.onSocketData(chunk))
    socket.on('error', (err) => this.emitClose(new TransportError(err.message)))
    socket.on('close', () => {
      const wasManual = this.manualClose
      this.socket = null
      this.emitClose(wasManual ? undefined : new ConnectionClosedError())
      if (!wasManual) {
        this.scheduleReconnect()
      }
    })

    this.socket = socket
    this.reconnectDelay = this.options.reconnectDelayMs ?? 300
    this.connectCallbacks.forEach((cb) => cb())
  }

  private onSocketData(chunk: Buffer): void {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk])

    while (this.receiveBuffer.length >= 7) {
      const pduLength = this.receiveBuffer.readUInt16BE(4)
      const frameLength = 6 + pduLength
      if (this.receiveBuffer.length < frameLength) {
        return
      }

      const frame = this.receiveBuffer.subarray(0, frameLength)
      this.receiveBuffer = this.receiveBuffer.subarray(frameLength)
      const payload = new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength)
      this.dataCallbacks.forEach((cb) => cb(payload))
    }
  }

  private scheduleReconnect(): void {
    if (this.manualClose || this.reconnectTimer) {
      return
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.openSocket()
      } catch {
        const maxDelay = this.options.maxReconnectDelayMs ?? 5000
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, maxDelay)
        this.scheduleReconnect()
      }
    }, this.reconnectDelay)
  }

  private emitClose(err?: Error): void {
    this.closeCallbacks.forEach((cb) => cb(err))
  }
}
