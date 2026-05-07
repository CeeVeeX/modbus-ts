import { describe, expect, it } from 'vitest'
import { decodeResponse, encodeReadHoldingRegisters, encodeWriteSingleRegister } from '../src/index'

describe('protocol', () => {
  it('encodes read holding registers request', () => {
    const frame = encodeReadHoldingRegisters({
      transactionId: 1,
      unitId: 1,
      startAddress: 100,
      quantity: 2,
    })

    expect(frame.length).toBe(12)
    expect(frame[7]).toBe(3)
  })

  it('encodes write single request', () => {
    const frame = encodeWriteSingleRegister({
      transactionId: 2,
      unitId: 1,
      address: 10,
      value: 1234,
    })

    expect(frame[7]).toBe(6)
  })

  it('decodes read response', () => {
    const response = decodeResponse(
      Uint8Array.from([
        0x00, 0x01, 0x00, 0x00, 0x00, 0x07, 0x01, 0x03, 0x04, 0x00, 0x2a, 0x00, 0x2b,
      ]),
    )

    expect(response.success).toBe(true)
    expect(response.registers).toEqual([42, 43])
  })
})
