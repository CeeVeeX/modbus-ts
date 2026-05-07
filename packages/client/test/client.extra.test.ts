import { describe, expect, it, vi } from 'vitest'
import type { Transport } from '@modbus-ts/core'
import { ModbusClient } from '../src/index'

class RichMockTransport implements Transport {
  private onDataCb: ((data: Uint8Array) => void) | null = null
  private onCloseCb: ((err?: Error) => void) | null = null
  private onConnectCb: (() => void) | null = null
  public failSend = false

  async connect(): Promise<void> {
    this.onConnectCb?.()
  }

  async close(): Promise<void> {}

  async send(data: Uint8Array): Promise<void> {
    if (this.failSend) {
      throw new Error('send-fail')
    }

    const tx = (data[0] << 8) | data[1]
    const fc = data[7]

    if (fc === 0x06) {
      this.onDataCb?.(
        Uint8Array.from([
          (tx >> 8) & 0xff,
          tx & 0xff,
          0x00,
          0x00,
          0x00,
          0x06,
          0x01,
          0x06,
          0x00,
          0x0a,
          0x00,
          0x7b,
        ]),
      )
      return
    }

    if (fc === 0x10) {
      this.onDataCb?.(
        Uint8Array.from([
          (tx >> 8) & 0xff,
          tx & 0xff,
          0x00,
          0x00,
          0x00,
          0x06,
          0x01,
          0x10,
          0x00,
          0x01,
          0x00,
          0x02,
        ]),
      )
      return
    }

    this.onDataCb?.(
      Uint8Array.from([
        (tx >> 8) & 0xff,
        tx & 0xff,
        0x00,
        0x00,
        0x00,
        0x07,
        0x01,
        0x03,
        0x04,
        0x00,
        0x2a,
        0x00,
        0x2b,
      ]),
    )
  }

  onData(cb: (data: Uint8Array) => void): void {
    this.onDataCb = cb
  }

  onClose(cb: (err?: Error) => void): void {
    this.onCloseCb = cb
  }

  onConnect(cb: () => void): void {
    this.onConnectCb = cb
  }

  triggerClose(err?: Error): void {
    this.onCloseCb?.(err)
  }
}

class MinimalTransport implements Transport {
  private onDataCb: ((data: Uint8Array) => void) | null = null
  private onCloseCb: ((err?: Error) => void) | null = null

  async connect(): Promise<void> {}
  async close(): Promise<void> {}
  async send(_data: Uint8Array): Promise<void> {}

  onData(cb: (data: Uint8Array) => void): void {
    this.onDataCb = cb
  }

  onClose(cb: (err?: Error) => void): void {
    this.onCloseCb = cb
  }

  emitData(data: Uint8Array): void {
    this.onDataCb?.(data)
  }

  emitClose(err?: Error): void {
    this.onCloseCb?.(err)
  }
}

class ExceptionTransport implements Transport {
  private onDataCb: ((data: Uint8Array) => void) | null = null
  private onCloseCb: ((err?: Error) => void) | null = null
  private onConnectCb: (() => void) | null = null

  async connect(): Promise<void> {
    this.onConnectCb?.()
  }

  async close(): Promise<void> {}

  async send(data: Uint8Array): Promise<void> {
    const tx = (data[0] << 8) | data[1]
    this.onDataCb?.(
      Uint8Array.from([(tx >> 8) & 0xff, tx & 0xff, 0x00, 0x00, 0x00, 0x03, 0x01, 0x83, 0x02]),
    )
  }

  onData(cb: (data: Uint8Array) => void): void {
    this.onDataCb = cb
  }

  onClose(cb: (err?: Error) => void): void {
    this.onCloseCb = cb
  }

  onConnect(cb: () => void): void {
    this.onConnectCb = cb
  }
}

class NoResponseTransport implements Transport {
  private onDataCb: ((data: Uint8Array) => void) | null = null
  private onCloseCb: ((err?: Error) => void) | null = null
  private onConnectCb: (() => void) | null = null

  async connect(): Promise<void> {
    this.onConnectCb?.()
  }

  async close(): Promise<void> {}

  async send(_data: Uint8Array): Promise<void> {}

  onData(cb: (data: Uint8Array) => void): void {
    this.onDataCb = cb
  }

  onClose(cb: (err?: Error) => void): void {
    this.onCloseCb = cb
  }

  onConnect(cb: () => void): void {
    this.onConnectCb = cb
  }

  triggerClose(err?: Error): void {
    this.onCloseCb?.(err)
  }
}

describe('client extra', () => {
  it('supports write single and write multiple', async () => {
    const transport = new RichMockTransport()
    const client = new ModbusClient({ transport, defaultUnitId: 1 })

    await client.connect()
    await expect(client.writeSingleRegister(10, 123)).resolves.toBeUndefined()
    await expect(client.writeMultipleRegisters(1, [10, 20])).resolves.toBeUndefined()
  })

  it('emits disconnect on close event', async () => {
    const transport = new RichMockTransport()
    const client = new ModbusClient({ transport, defaultUnitId: 1 })
    const onDisconnect = vi.fn()
    client.on('disconnect', onDisconnect)

    await client.connect()
    transport.triggerClose(new Error('bye'))

    expect(onDisconnect).toHaveBeenCalled()
  })

  it('rejects when transport send fails', async () => {
    const transport = new RichMockTransport()
    const client = new ModbusClient({ transport, defaultUnitId: 1 })
    transport.failSend = true

    await client.connect()
    await expect(client.readHoldingRegisters(0, 2)).rejects.toThrow('send-fail')
  })

  it('emits error when payload decode fails', async () => {
    const transport = new MinimalTransport()
    const client = new ModbusClient({ transport, defaultUnitId: 1 })
    const onError = vi.fn()
    client.on('error', onError)

    transport.emitData(Uint8Array.from([0x01]))

    expect(onError).toHaveBeenCalled()
  })

  it('throws protocol error on exception response', async () => {
    const transport = new ExceptionTransport()
    const client = new ModbusClient({ transport, defaultUnitId: 1 })

    await client.connect()
    await expect(client.readHoldingRegisters(0, 1)).rejects.toThrow('modbus exception 2')
  })

  it('emits timeout and rejects when request times out', async () => {
    const transport = new NoResponseTransport()
    const client = new ModbusClient({ transport, defaultUnitId: 1, defaultTimeout: 5 })
    const onTimeout = vi.fn()
    client.on('timeout', onTimeout)

    await client.connect()
    await expect(client.readHoldingRegisters(0, 1)).rejects.toThrow('timeout')
    expect(onTimeout).toHaveBeenCalled()
  })

  it('rejects in-flight request on close and supports tx wrap-around', async () => {
    const transport = new NoResponseTransport()
    const client = new ModbusClient({ transport, defaultUnitId: 1, defaultTimeout: 50 })
    ;(client as any).sequence = 0xffff

    await client.connect()
    const pending = client.readHoldingRegisters(0, 1)
    transport.triggerClose(new Error('gone'))

    await expect(pending).rejects.toThrow('connection closed')
    expect((client as any).sequence).toBe(1)
  })

  it('works with transport without onConnect callback API', async () => {
    const transport: Transport = {
      async connect() {},
      async close() {},
      async send() {},
      onData() {},
      onClose() {},
    }

    const client = new ModbusClient({ transport, defaultUnitId: 1 })
    await expect(client.connect()).resolves.toBeUndefined()
  })
})
