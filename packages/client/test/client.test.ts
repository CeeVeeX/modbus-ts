import { describe, expect, it } from 'vitest'
import type { Transport } from '@modbus-ts/core'
import { ModbusClient } from '../src/index'

class MockTransport implements Transport {
  private onDataCb: ((data: Uint8Array) => void) | null = null
  private onCloseCb: ((err?: Error) => void) | null = null

  async connect(): Promise<void> {}
  async close(): Promise<void> {}

  async send(data: Uint8Array): Promise<void> {
    const tx = (data[0] << 8) | data[1]
    const response = Uint8Array.from([
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
    ])
    this.onDataCb?.(response)
  }

  onData(cb: (data: Uint8Array) => void): void {
    this.onDataCb = cb
  }

  onClose(cb: (err?: Error) => void): void {
    this.onCloseCb = cb
  }

  triggerClose(err?: Error): void {
    this.onCloseCb?.(err)
  }
}

describe('client', () => {
  it('reads registers through scheduler + protocol', async () => {
    const transport = new MockTransport()
    const client = new ModbusClient({ transport })

    await client.connect()
    const values = await client.readHoldingRegisters(0, 2)

    expect(values).toEqual([42, 43])
  })

  it('reads input registers through FC4 wrapper', async () => {
    const transport = new MockTransport()
    const client = new ModbusClient({ transport })

    await client.connect()
    const values = await client.readInputRegisters(0, 2)

    expect(values).toEqual([42, 43])
  })
})
