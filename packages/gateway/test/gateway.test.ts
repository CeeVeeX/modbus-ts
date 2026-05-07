import { describe, expect, it, vi } from 'vitest'

function createEmitter() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>()
  return {
    on(event: string, cb: (...args: any[]) => void) {
      const list = listeners.get(event) ?? []
      list.push(cb)
      listeners.set(event, list)
      return this
    },
    off(event: string, cb: (...args: any[]) => void) {
      const list = listeners.get(event) ?? []
      listeners.set(
        event,
        list.filter((item) => item !== cb),
      )
      return this
    },
    once(event: string, cb: (...args: any[]) => void) {
      const wrapped = (...args: any[]) => {
        this.off(event, wrapped)
        cb(...args)
      }
      return this.on(event, wrapped)
    },
    emit(event: string, ...args: any[]) {
      const list = listeners.get(event) ?? []
      list.forEach((cb) => cb(...args))
    },
  }
}

function setupGatewayMocks() {
  const sockets: any[] = []
  const servers: any[] = []

  class MockSocket {
    destroyed = false
    private emitter = createEmitter()

    on = this.emitter.on
    off = this.emitter.off
    once = this.emitter.once
    emit = this.emitter.emit

    constructor() {
      sockets.push(this)
    }

    connect(_port: number, _host: string, cb: () => void): void {
      cb()
    }
    setNoDelay(): void {}
    write(_data: Buffer): void {}
    destroy(): void {
      this.destroyed = true
      this.emit('close')
    }
  }

  class MockWSS {
    private emitter = createEmitter()
    on = this.emitter.on
    emit = this.emitter.emit

    constructor(_options: { port: number }) {
      servers.push(this)
    }

    close(cb: () => void): void {
      cb()
    }
  }

  vi.doMock('node:net', () => ({
    default: {
      Socket: MockSocket,
    },
  }))

  vi.doMock('ws', () => ({
    WebSocketServer: MockWSS,
  }))

  return { sockets, servers }
}

describe('gateway', () => {
  it('starts and stops server', async () => {
    vi.resetModules()
    setupGatewayMocks()
    const { ModbusGateway } = await import('../src/index')

    const g = new ModbusGateway({ wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 })
    await g.start()
    await expect(g.start()).resolves.toBeUndefined()
    await expect(g.stop()).resolves.toBeUndefined()
    await expect(g.stop()).resolves.toBeUndefined()
  })

  it('handles ws connection relay and release', async () => {
    vi.resetModules()
    const { sockets } = setupGatewayMocks()
    const { ModbusGateway } = await import('../src/index')

    const g = new ModbusGateway({ wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 })

    const ws = createEmitter() as ReturnType<typeof createEmitter> & {
      OPEN: number
      readyState: number
      send: ReturnType<typeof vi.fn>
      on: (event: string, handler: (...args: any[]) => void) => any
    }

    ws.OPEN = 1
    ws.readyState = 1
    ws.send = vi.fn()

    await (g as any).handleConnection(ws)

    sockets[0].emit('data', Buffer.from([1, 2]))
    expect(ws.send).toHaveBeenCalled()

    ws.emit('message', Buffer.from([3, 4]))
    ws.emit('close')
    ws.emit('error')

    const first = await (g as any).pool.acquire('127.0.0.1', 502)
    ;(g as any).pool.release(first)
    const second = await (g as any).pool.acquire('127.0.0.1', 502)
    expect(second.socket).toBe(first.socket)
  })

  it('skips ws send when socket not open and handles arraybuffer message', async () => {
    vi.resetModules()
    const { sockets } = setupGatewayMocks()
    const { ModbusGateway } = await import('../src/index')

    const g = new ModbusGateway({ wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 })
    const ws = createEmitter() as ReturnType<typeof createEmitter> & {
      OPEN: number
      readyState: number
      send: ReturnType<typeof vi.fn>
    }

    ws.OPEN = 1
    ws.readyState = 0
    ws.send = vi.fn()

    await (g as any).handleConnection(ws)

    sockets[0].emit('data', Buffer.from([1, 2]))
    expect(ws.send).not.toHaveBeenCalled()

    ws.emit('message', new Uint8Array([9, 8]).buffer)
  })
})
