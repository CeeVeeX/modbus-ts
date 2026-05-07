import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WsTransport } from '../src/index'

class MockWebSocket {
  static OPEN = 1
  static instances: MockWebSocket[] = []
  static failConnectTimes = 0

  readyState = MockWebSocket.OPEN
  binaryType = ''
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: ArrayBuffer | string }) => void) | null = null

  constructor(_url: string) {
    MockWebSocket.instances.push(this)
    queueMicrotask(() => {
      if (MockWebSocket.failConnectTimes > 0) {
        MockWebSocket.failConnectTimes--
        this.onerror?.()
      } else {
        this.onopen?.()
      }
    })
  }

  send(_data: Uint8Array): void {}

  close(): void {
    this.onclose?.()
  }
}

describe('transport-ws', () => {
  beforeEach(() => {
    MockWebSocket.instances.length = 0
    MockWebSocket.failConnectTimes = 0
    ;(globalThis as any).WebSocket = MockWebSocket
  })

  it('connects, receives frame, sends and closes', async () => {
    const t = new WsTransport({ url: 'ws://localhost:18080' })
    const onData = vi.fn()
    const onConnect = vi.fn()
    const onClose = vi.fn()
    t.onData(onData)
    t.onConnect(onConnect)
    t.onClose(onClose)

    await t.connect()
    await expect(t.send(Uint8Array.from([1]))).resolves.toBeUndefined()

    const ws = MockWebSocket.instances[0]
    ws.onmessage?.({
      data: Uint8Array.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x01, 0x03, 0x00]).buffer,
    })

    expect(onConnect).toHaveBeenCalled()
    expect(onData).toHaveBeenCalled()

    await t.close()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('throws when send without open socket', async () => {
    const t = new WsTransport({ url: 'ws://localhost:18080' })
    await expect(t.send(Uint8Array.from([1]))).rejects.toThrow('websocket is not connected')
  })

  it('reconnects after unexpected close', async () => {
    vi.useFakeTimers()
    const t = new WsTransport({ url: 'ws://localhost:18080', reconnectDelayMs: 1 })
    await t.connect()

    const ws = MockWebSocket.instances[0]
    ws.onclose?.()
    await vi.runAllTimersAsync()

    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2)
    vi.useRealTimers()
  })

  it('throws when WebSocket is unavailable', async () => {
    delete (globalThis as any).WebSocket
    const t = new WsTransport({ url: 'ws://localhost:18080' })
    await expect(t.connect()).rejects.toThrow('WebSocket is not available')
  })

  it('connect is idempotent when socket already open', async () => {
    const t = new WsTransport({ url: 'ws://localhost:18080' })
    await t.connect()
    const count = MockWebSocket.instances.length

    await t.connect()

    expect(MockWebSocket.instances.length).toBe(count)
  })

  it('close without websocket returns directly and onerror emits close callback', async () => {
    const t = new WsTransport({ url: 'ws://localhost:18080' })
    const onClose = vi.fn()
    t.onClose(onClose)

    await expect(t.close()).resolves.toBeUndefined()

    await t.connect()
    const ws = MockWebSocket.instances[0]
    ws.onerror?.()
    expect(onClose).toHaveBeenCalled()
  })

  it('backs off and retries reconnect after reconnect failure', async () => {
    vi.useFakeTimers()
    const t = new WsTransport({
      url: 'ws://localhost:18080',
      reconnectDelayMs: 1,
      maxReconnectDelayMs: 4,
    })

    await t.connect()
    MockWebSocket.failConnectTimes = 1
    MockWebSocket.instances[0].onclose?.()

    await vi.advanceTimersByTimeAsync(1)
    await vi.advanceTimersByTimeAsync(2)

    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(3)
    vi.useRealTimers()
  })
})
