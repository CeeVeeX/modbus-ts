import { beforeEach, describe, expect, it, vi } from 'vitest'

function setupNetMock() {
  const instances: any[] = []

  class MockSocket {
    destroyed = false
    writeError: Error | null = null
    private listeners = new Map<string, Array<(...args: any[]) => void>>()

    constructor() {
      instances.push(this)
    }

    on(event: string, cb: (...args: any[]) => void): this {
      const list = this.listeners.get(event) ?? []
      list.push(cb)
      this.listeners.set(event, list)
      return this
    }

    once(event: string, cb: (...args: any[]) => void): this {
      const wrapped = (...args: any[]) => {
        this.off(event, wrapped)
        cb(...args)
      }
      return this.on(event, wrapped)
    }

    off(event: string, cb: (...args: any[]) => void): this {
      const list = this.listeners.get(event) ?? []
      this.listeners.set(
        event,
        list.filter((item) => item !== cb),
      )
      return this
    }

    emit(event: string, ...args: any[]): void {
      const list = this.listeners.get(event) ?? []
      list.forEach((cb) => cb(...args))
    }

    setNoDelay(): void {}

    setTimeout(_ms: number, _cb?: () => void): void {}

    connect(_port: number, _host: string, cb: () => void): void {
      cb()
    }

    write(_data: Uint8Array, cb: (err?: Error | null) => void): void {
      cb(this.writeError)
    }

    end(): void {
      this.emit('close')
    }

    destroy(): void {
      this.destroyed = true
      this.emit('close')
    }
  }

  vi.doMock('node:net', () => ({
    default: {
      Socket: MockSocket,
    },
  }))

  return instances
}

describe('transport-tcp', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('connects, sends, and closes', async () => {
    const instances = setupNetMock()
    const { TcpTransport } = await import('../src/index')
    const t = new TcpTransport({ host: '127.0.0.1', port: 502 })

    const onConnect = vi.fn()
    const onClose = vi.fn()
    const onData = vi.fn()
    t.onConnect(onConnect)
    t.onClose(onClose)
    t.onData(onData)

    await t.connect()
    await expect(t.send(Uint8Array.from([1, 2]))).resolves.toBeUndefined()

    const s = instances[0]
    s.emit('data', Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x01, 0x03, 0x00]))

    expect(onConnect).toHaveBeenCalled()
    expect(onData).toHaveBeenCalled()

    await t.close()
    expect(onClose).toHaveBeenCalled()
  })

  it('throws when sending without socket', async () => {
    setupNetMock()
    const { TcpTransport } = await import('../src/index')
    const t = new TcpTransport({ host: '127.0.0.1', port: 502 })
    await expect(t.send(Uint8Array.from([1]))).rejects.toThrow('socket is not connected')
  })

  it('maps write error to transport error', async () => {
    const instances = setupNetMock()
    const { TcpTransport } = await import('../src/index')
    const t = new TcpTransport({ host: '127.0.0.1', port: 502 })
    await t.connect()
    instances[0].writeError = new Error('write failed')

    await expect(t.send(Uint8Array.from([1]))).rejects.toThrow('write failed')
  })

  it('reconnects when socket closes unexpectedly', async () => {
    const instances = setupNetMock()
    const { TcpTransport } = await import('../src/index')
    vi.useFakeTimers()
    const t = new TcpTransport({ host: '127.0.0.1', port: 502, reconnectDelayMs: 1 })
    await t.connect()

    instances[0].emit('close')
    await vi.runAllTimersAsync()

    expect(instances.length).toBeGreaterThanOrEqual(2)
    vi.useRealTimers()
  })

  it('connect is guarded when socket already exists and close clears timer', async () => {
    const instances = setupNetMock()
    const { TcpTransport } = await import('../src/index')
    const t = new TcpTransport({ host: '127.0.0.1', port: 502 })

    await t.connect()
    const count = instances.length
    await t.connect()
    expect(instances.length).toBe(count)
    ;(t as any).reconnectTimer = setTimeout(() => {}, 1000)
    await t.close()
    expect((t as any).reconnectTimer).toBeNull()
  })
})
