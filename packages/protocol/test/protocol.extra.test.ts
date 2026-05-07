import { describe, expect, it } from 'vitest'
import {
  decodeResponse,
  encodeReadHoldingRegisters,
  encodeWriteMultipleRegisters,
} from '../src/index'

describe('protocol extra', () => {
  it('encodes FC16 write multiple', () => {
    const frame = encodeWriteMultipleRegisters({
      transactionId: 5,
      unitId: 1,
      startAddress: 10,
      values: [1, 2],
    })
    expect(frame[7]).toBe(16)
  })

  it('throws for invalid u16 fields', () => {
    expect(() =>
      encodeReadHoldingRegisters({
        transactionId: -1,
        unitId: 1,
        startAddress: 0,
        quantity: 1,
      }),
    ).toThrow('transactionId')

    expect(() =>
      encodeWriteMultipleRegisters({
        transactionId: 1,
        unitId: 1,
        startAddress: 0,
        values: [],
      }),
    ).toThrow('1..123')
  })

  it('decodes exception response', () => {
    const res = decodeResponse(
      Uint8Array.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x01, 0x83, 0x02]),
    )
    expect(res.success).toBe(false)
    expect(res.exceptionCode).toBe(2)
  })

  it('throws for invalid protocol, length and function code', () => {
    expect(() =>
      decodeResponse(Uint8Array.from([0x00, 0x01, 0x00, 0x01, 0x00, 0x03, 0x01, 0x03, 0x00])),
    ).toThrow('invalid protocol id')

    expect(() =>
      decodeResponse(Uint8Array.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x04, 0x01, 0x06, 0x00])),
    ).toThrow('invalid mbap length')

    expect(() =>
      decodeResponse(Uint8Array.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x01, 0x11, 0x00])),
    ).toThrow('unsupported function code')
  })
})
