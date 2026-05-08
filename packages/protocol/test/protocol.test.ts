import { describe, expect, it } from 'vitest'
import {
  decodeResponse,
  encodeReadCoils,
  encodeReadDiscreteInputs,
  encodeReadHoldingRegisters,
  encodeWriteSingleCoil,
  encodeWriteSingleRegister,
} from '../src/index'

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

  it('encodes read coils request', () => {
    const frame = encodeReadCoils({
      transactionId: 1,
      unitId: 1,
      startAddress: 0,
      quantity: 10,
    })

    expect(frame.length).toBe(12)
    expect(frame[7]).toBe(1)
  })

  it('encodes read discrete inputs request', () => {
    const frame = encodeReadDiscreteInputs({
      transactionId: 1,
      unitId: 1,
      startAddress: 0,
      quantity: 10,
    })

    expect(frame.length).toBe(12)
    expect(frame[7]).toBe(2)
  })

  it('encodes write single coil request', () => {
    const frame = encodeWriteSingleCoil({
      transactionId: 3,
      unitId: 1,
      address: 5,
      value: true,
    })

    expect(frame[7]).toBe(5)
    expect(frame[10]).toBe(0xff)
    expect(frame[11]).toBe(0x00)
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

  it('decodes read coils response', () => {
    const response = decodeResponse(
      Uint8Array.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x04, 0x01, 0x01, 0x01, 0x4d]),
    )

    expect(response.success).toBe(true)
    expect(response.coils?.slice(0, 8)).toEqual([
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      false,
    ])
  })

  it('decodes read discrete inputs response', () => {
    const response = decodeResponse(
      Uint8Array.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x04, 0x01, 0x02, 0x01, 0x25]),
    )

    expect(response.success).toBe(true)
    expect(response.discreteInputs?.slice(0, 8)).toEqual([
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
    ])
  })
})
