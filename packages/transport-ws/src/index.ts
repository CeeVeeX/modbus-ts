import { ConnectionClosedError, TransportError, type Transport } from '@modbus-ts/core'

export interface WsTransportOptions {
  url: string
  reconnectDelayMs?: number
  maxReconnectDelayMs?: number
}

export type DataCallback = (data: Uint8Array) => void
export type CloseCallback = (err?: Error) => void
export type ConnectCallback = () => void

export class WsTransport implements Transport {
  private ws: WebSocket | null = null
  private dataCallbacks: DataCallback[] = []
  private closeCallbacks: CloseCallback[] = []
  private connectCallbacks: ConnectCallback[] = []
  private receiveBuffer = new Uint8Array(0)
  private reconnectDelay: number
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private manualClose = false

  constructor(private readonly options: WsTransportOptions) {
    this.reconnectDelay = options.reconnectDelayMs ?? 300
  }

  async connect(): Promise<void> {
    this.manualClose = false
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    await this.openSocket()
  }

  async close(): Promise<void> {
    this.manualClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (!this.ws) {
      return
    }

    const current = this.ws
    this.ws = null
    await new Promise<void>((resolve) => {
      current.onclose = () => resolve()
      current.close()
    })
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new ConnectionClosedError('websocket is not connected')
    }

    // TS6 narrows WebSocket.send binary payload to ArrayBuffer-backed BufferSource.
    this.ws.send(Uint8Array.from(data).buffer)
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
    if (typeof WebSocket === 'undefined') {
      throw new TransportError('WebSocket is not available in this runtime')
    }

    const ws = new WebSocket(this.options.url)
    ws.binaryType = 'arraybuffer'

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve()
      ws.onerror = () => reject(new TransportError('websocket connect failed'))
    })

    ws.onmessage = (event) => {
      const payload =
        event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : new Uint8Array(0)
      this.onSocketData(payload)
    }

    ws.onclose = () => {
      const wasManual = this.manualClose
      this.ws = null
      this.emitClose(wasManual ? undefined : new ConnectionClosedError())
      if (!wasManual) {
        this.scheduleReconnect()
      }
    }

    ws.onerror = () => {
      this.emitClose(new TransportError('websocket error'))
    }

    this.ws = ws
    this.reconnectDelay = this.options.reconnectDelayMs ?? 300
    this.connectCallbacks.forEach((cb) => cb())
  }

  private onSocketData(chunk: Uint8Array): void {
    const merged = new Uint8Array(this.receiveBuffer.length + chunk.length)
    merged.set(this.receiveBuffer, 0)
    merged.set(chunk, this.receiveBuffer.length)
    this.receiveBuffer = merged

    while (this.receiveBuffer.length >= 7) {
      const view = new DataView(
        this.receiveBuffer.buffer,
        this.receiveBuffer.byteOffset,
        this.receiveBuffer.byteLength,
      )
      const pduLength = view.getUint16(4)
      const frameLength = 6 + pduLength
      if (this.receiveBuffer.length < frameLength) {
        return
      }

      const frame = this.receiveBuffer.slice(0, frameLength)
      this.receiveBuffer = this.receiveBuffer.slice(frameLength)
      this.dataCallbacks.forEach((cb) => cb(frame))
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
