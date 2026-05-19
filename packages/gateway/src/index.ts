import net from 'node:net'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'

interface PooledSocket {
  socket: net.Socket
  busy: boolean
  endpoint: string
}

class TcpConnectionPool {
  private pool = new Map<string, PooledSocket[]>()

  async acquire(host: string, port: number): Promise<PooledSocket> {
    const endpoint = `${host}:${port}`
    const candidates = this.pool.get(endpoint) ?? []
    // 优先复用空闲连接，减少频繁建连的握手开销。
    const idle = candidates.find((entry) => !entry.busy && !entry.socket.destroyed)
    if (idle) {
      idle.busy = true
      return idle
    }

    const socket = await this.createSocket(host, port)
    const entry: PooledSocket = { socket, busy: true, endpoint }
    const list = this.pool.get(endpoint) ?? []
    list.push(entry)
    this.pool.set(endpoint, list)
    return entry
  }

  release(entry: PooledSocket): void {
    entry.busy = false
  }

  async closeAll(): Promise<void> {
    const all = [...this.pool.values()].flat()
    await Promise.all(
      all.map(
        ({ socket }) =>
          new Promise<void>((resolve) => {
            socket.once('close', () => resolve())
            socket.destroy()
          }),
      ),
    )
    this.pool.clear()
  }

  private async createSocket(host: string, port: number): Promise<net.Socket> {
    const socket = new net.Socket()
    await new Promise<void>((resolve, reject) => {
      socket.once('error', reject)
      socket.connect(port, host, () => resolve())
    })
    socket.setNoDelay(true)
    return socket
  }
}

/**
 * 网关运行选项。
 *
 * @example
 * ```ts
 * const options: GatewayOptions = { wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 }
 * ```
 */
export interface GatewayOptions {
  wsPort: number
  plcHost: string
  plcPort: number
}

function rawDataToBuffer(message: RawData): Buffer {
  // ws 的 message 可能是 Buffer / ArrayBuffer / Buffer[]，统一归一化后再写 TCP。
  if (Buffer.isBuffer(message)) {
    return message
  }
  if (message instanceof ArrayBuffer) {
    return Buffer.from(message)
  }
  return Buffer.concat(message.map((part) => Buffer.from(part)))
}

/**
 * Modbus WebSocket 网关：把浏览器二进制帧转发到 PLC TCP。
 *
 * @example
 * ```ts
 * const gateway = new ModbusGateway({ wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 })
 * await gateway.start()
 * ```
 */
export class ModbusGateway {
  private wss: WebSocketServer | null = null
  private pool = new TcpConnectionPool()

  constructor(private readonly options: GatewayOptions) {}

  async start(): Promise<void> {
    if (this.wss) {
      return
    }

    this.wss = new WebSocketServer({ port: this.options.wsPort })
    this.wss.on('connection', (ws) => {
      void this.handleConnection(ws)
    })
  }

  async stop(): Promise<void> {
    if (!this.wss) {
      return
    }

    await new Promise<void>((resolve) => {
      this.wss?.close(() => resolve())
    })
    this.wss = null
    await this.pool.closeAll()
  }

  private async handleConnection(ws: WebSocket): Promise<void> {
    const entry = await this.pool.acquire(this.options.plcHost, this.options.plcPort)
    const { socket } = entry
    let released = false

    const releaseOnce = (): void => {
      // 同一个连接会收到 ws.close / ws.error / socket.close / socket.error 多路事件，
      // 必须幂等释放，避免重复解绑和重复归还连接池。
      if (released) {
        return
      }
      released = true
      socket.off('data', onSocketData)
      socket.off('error', onSocketError)
      socket.off('close', onSocketClose)
      this.pool.release(entry)
    }

    const onSocketData = (chunk: Buffer) => {
      // 仅在 ws 可写时转发，避免关闭态发送导致异常。
      if (ws.readyState === ws.OPEN) {
        ws.send(chunk)
      }
    }

    const onSocketError = (): void => {
      releaseOnce()
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
        ws.close(1011, 'tcp socket error')
      }
    }

    const onSocketClose = (): void => {
      releaseOnce()
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
        ws.close(1011, 'tcp socket closed')
      }
    }

    socket.on('data', onSocketData)
    socket.on('error', onSocketError)
    socket.on('close', onSocketClose)

    ws.on('message', (message: RawData) => {
      // 浏览器侧一帧即 PLC 一帧，网关不改写 MBAP/PDU，只做透明转发。
      socket.write(rawDataToBuffer(message))
    })

    ws.on('close', () => {
      releaseOnce()
    })

    ws.on('error', () => {
      releaseOnce()
    })
  }
}
