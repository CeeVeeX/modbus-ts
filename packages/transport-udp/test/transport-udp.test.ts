import { beforeEach, describe, expect, it, vi } from 'vitest'

function createEmitter() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>()
  return {
    on(event: string, cb: (...args: any[]) => void) {
      const list = listeners.get(event) ?? []
      list.push(cb)
      listeners.set(event, list)
      return this
    },
    once(event: string, cb: (...args: any[]) => void) {
      const wrapped = (...args: any[]) => {
        this.off(event, wrapped)
        cb(...args)
      }
      return this.on(event, wrapped)
    },
    off(event: string, cb: (...args: any[]) => void) {
      const list = listeners.get(event) ?? []
      listeners.set(
        event,
        list.filter((item) => item !== cb),
      )
      return this
    },
    emit(event: string, ...args: any[]) {
      const list = listeners.get(event) ?? []
      list.forEach((cb) => cb(...args))
    },
  }
}

describe('transport-udp', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('connects, sends and receives', async () => {
    const sockets: any[] = []
    class MockSocket {
      private emitter = createEmitter()
      on = this.emitter.on
      once = this.emitter.once
      off = this.emitter.off
      emit = this.emitter.emit

      constructor() {
        sockets.push(this)
      }

      bind(_port: number, _address: string | undefined, cb: () => void): void {
        cb()
      }

      send(
        _data: Uint8Array,
        _port: number,
        _host: string,
        cb: (err?: Error | null) => void,
      ): void {
        cb(null)
      }

      close(): void {
        this.emit('close')
      }
    }

    vi.doMock('node:dgram', () => ({
      default: {
        createSocket: () => new MockSocket(),
      },
    }))

    const { UdpTransport } = await import('../src/index')
    const t = new UdpTransport({ host: '127.0.0.1', port: 502 })
    const onData = vi.fn()
    t.onData(onData)

    await t.connect()
    await expect(t.send(Uint8Array.from([1, 2]))).resolves.toBeUndefined()

    const msg = Buffer.from([0, 1, 0, 0, 0, 3, 1, 3, 0])
    sockets[0].emit('message', msg)
    expect(onData).toHaveBeenCalled()

    await t.close()
  })

  it('throws if sending before connect', async () => {
    vi.doMock('node:dgram', () => ({
      default: {
        createSocket: () => ({}),
      },
    }))

    const { UdpTransport } = await import('../src/index')
    const t = new UdpTransport({ host: '127.0.0.1', port: 502 })
    await expect(t.send(Uint8Array.from([1]))).rejects.toThrow('not connected')
  })
})
