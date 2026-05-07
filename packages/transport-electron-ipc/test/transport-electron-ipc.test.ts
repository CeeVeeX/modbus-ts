import { describe, expect, it, vi } from 'vitest'
import { ElectronIpcTransport } from '../src/index'

class MockBridge {
  handlers = new Map<string, Set<(...args: unknown[]) => void>>()
  invoke = vi.fn(async (_channel: string, _payload?: unknown) => undefined)

  on(channel: string, listener: (...args: unknown[]) => void): void {
    const set = this.handlers.get(channel) ?? new Set<(...args: unknown[]) => void>()
    set.add(listener)
    this.handlers.set(channel, set)
  }

  off(channel: string, listener: (...args: unknown[]) => void): void {
    this.handlers.get(channel)?.delete(listener)
  }

  emit(channel: string, ...args: unknown[]): void {
    this.handlers.get(channel)?.forEach((listener) => listener(...args))
  }
}

describe('transport-electron-ipc', () => {
  it('connects, sends and receives Uint8Array payload', async () => {
    const bridge = new MockBridge()
    const t = new ElectronIpcTransport({ ipc: bridge })
    const onData = vi.fn()
    const onConnect = vi.fn()

    t.onData(onData)
    t.onConnect(onConnect)

    await t.connect()
    await t.send(Uint8Array.from([1, 2, 3]))
    bridge.emit('modbus:data', {}, Uint8Array.from([9, 8, 7]))

    expect(onConnect).toHaveBeenCalledTimes(1)
    expect(onData).toHaveBeenCalledTimes(1)
    expect(bridge.invoke).toHaveBeenCalledWith('modbus:connect')
    expect(bridge.invoke).toHaveBeenCalledWith('modbus:send', Uint8Array.from([1, 2, 3]))
  })

  it('accepts ArrayBuffer and number[] payloads', async () => {
    const bridge = new MockBridge()
    const t = new ElectronIpcTransport({ ipc: bridge })
    const onData = vi.fn()
    t.onData(onData)

    await t.connect()

    bridge.emit('modbus:data', new Uint8Array([1, 2]).buffer)
    bridge.emit('modbus:data', [3, 4])

    expect(onData).toHaveBeenNthCalledWith(1, Uint8Array.from([1, 2]))
    expect(onData).toHaveBeenNthCalledWith(2, Uint8Array.from([3, 4]))
  })

  it('emits close on remote close event and send rejects when disconnected', async () => {
    const bridge = new MockBridge()
    const t = new ElectronIpcTransport({ ipc: bridge })
    const onClose = vi.fn()
    t.onClose(onClose)

    await t.connect()
    bridge.emit('modbus:closed', { message: 'main process closed' })

    expect(onClose).toHaveBeenCalled()
    await expect(t.send(Uint8Array.from([1]))).rejects.toThrow('not connected')
  })

  it('maps invoke failures to transport error', async () => {
    const bridge = new MockBridge()
    bridge.invoke.mockRejectedValueOnce(new Error('connect-boom'))
    const t = new ElectronIpcTransport({ ipc: bridge })

    await expect(t.connect()).rejects.toThrow('connect-boom')
  })

  it('supports custom channels and close cleanup', async () => {
    const bridge = new MockBridge()
    const t = new ElectronIpcTransport({
      ipc: bridge,
      connectChannel: 'x:connect',
      closeChannel: 'x:close',
      sendChannel: 'x:send',
      dataEventChannel: 'x:data',
      closeEventChannel: 'x:closed',
    })

    const onData = vi.fn()
    t.onData(onData)

    await t.connect()
    bridge.emit('x:data', {}, [7, 7])
    expect(onData).toHaveBeenCalledWith(Uint8Array.from([7, 7]))

    await t.close()
    expect(bridge.invoke).toHaveBeenCalledWith('x:close')

    // listener should be detached after close.
    bridge.emit('x:data', {}, [1, 1])
    expect(onData).toHaveBeenCalledTimes(1)
  })
})
