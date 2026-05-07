import { describe, expect, it, vi } from 'vitest'
import {
  createElectronMainBridge,
  createElectronRendererBridge,
  type ElectronIpcMainLike,
  type ElectronIpcRendererLike,
} from '../src/index'

class MockRenderer {
  handlers = new Map<string, Set<(...args: unknown[]) => void>>()
  invoke = vi.fn(async () => undefined)

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

class MockIpcMain {
  handlers = new Map<string, (_event: unknown, payload?: unknown) => Promise<unknown> | unknown>()

  handle(
    channel: string,
    handler: (_event: unknown, payload?: unknown) => Promise<unknown> | unknown,
  ): void {
    this.handlers.set(channel, handler)
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel)
  }

  async invoke(channel: string, payload?: unknown): Promise<unknown> {
    const handler = this.handlers.get(channel)
    if (!handler) {
      throw new Error(`missing handler ${channel}`)
    }
    return handler({}, payload)
  }
}

describe('electron-ipc-bridge', () => {
  it('adapts renderer ipc surface', async () => {
    const renderer = new MockRenderer()
    const bridge = createElectronRendererBridge(renderer as unknown as ElectronIpcRendererLike)
    const listener = vi.fn()

    bridge.on('modbus:data', listener)
    renderer.emit('modbus:data', Uint8Array.from([1]))

    expect(listener).toHaveBeenCalled()
    await expect(bridge.invoke('modbus:connect')).resolves.toBeUndefined()
  })

  it('registers main bridge handlers and emits to renderer', async () => {
    const ipcMain = new MockIpcMain()
    const emitToRenderer = vi.fn()
    const onConnect = vi.fn(async () => undefined)
    const onSend = vi.fn(async () => undefined)
    const onClose = vi.fn(async () => undefined)

    const bridge = createElectronMainBridge({
      ipcMain: ipcMain as unknown as ElectronIpcMainLike,
      emitToRenderer,
      onConnect,
      onSend,
      onClose,
    })

    await ipcMain.invoke('modbus:connect')
    await ipcMain.invoke('modbus:send', [1, 2, 3])
    await ipcMain.invoke('modbus:close')

    expect(onConnect).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith(Uint8Array.from([1, 2, 3]))
    expect(onClose).toHaveBeenCalledTimes(1)

    bridge.emitData(Uint8Array.from([8]))
    bridge.emitClosed({ message: 'closed' })
    expect(emitToRenderer).toHaveBeenCalledWith('modbus:data', Uint8Array.from([8]))
    expect(emitToRenderer).toHaveBeenCalledWith('modbus:closed', { message: 'closed' })

    bridge.dispose()
    await expect(ipcMain.invoke('modbus:connect')).rejects.toThrow('missing handler')
  })
})
