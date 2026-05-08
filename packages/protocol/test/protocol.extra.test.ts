import { describe, expect, it } from 'vitest'
import {
  decodeResponseAscii,
  decodeResponseByMode,
  decodeResponseRtu,
  decodeResponse,
  encodeReadCoilsByMode,
  encodeReadDiscreteInputsByMode,
  encodeReadHoldingRegistersAscii,
  encodeReadHoldingRegistersByMode,
  encodeReadHoldingRegistersRtu,
  encodeReadHoldingRegisters,
  encodeWriteMultipleCoils,
  encodeWriteMultipleRegisters,
  encodeWriteSingleCoilByMode,
} from '../src/index'

function crc16(data: Uint8Array): number {
  let crc = 0xffff
  for (const byte of data) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      const lsb = crc & 1
      crc >>= 1
      if (lsb) {
        crc ^= 0xa001
      }
    }
  }
  return crc & 0xffff
}

function withRtuCrc(body: Uint8Array): Uint8Array {
  const out = new Uint8Array(body.length + 2)
  out.set(body, 0)
  const crc = crc16(body)
  out[out.length - 2] = crc & 0xff
  out[out.length - 1] = (crc >> 8) & 0xff
  return out
}

function withAsciiLrc(body: Uint8Array): Uint8Array {
  let sum = 0
  for (const b of body) {
    sum = (sum + b) & 0xff
  }
  const lrc = (~sum + 1) & 0xff
  const hex = [...body, lrc].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')
  const text = `:${hex}\r\n`
  return Uint8Array.from([...text].map((c) => c.charCodeAt(0)))
}

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

  it('encodes FC15 write multiple coils', () => {
    const frame = encodeWriteMultipleCoils({
      transactionId: 7,
      unitId: 1,
      startAddress: 0,
      values: [true, false, true, true, false, false, false, true, true],
    })
    expect(frame[7]).toBe(15)
    expect(frame[13]).toBe(0x8d)
    expect(frame[14]).toBe(0x01)
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

    expect(() =>
      encodeWriteMultipleCoils({
        transactionId: 1,
        unitId: 1,
        startAddress: 0,
        values: [],
      }),
    ).toThrow('1..1968')
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

  it('encodes and decodes RTU', () => {
    const req = encodeReadHoldingRegistersRtu({ unitId: 1, startAddress: 100, quantity: 2 })
    expect(req[0]).toBe(1)
    expect(req[1]).toBe(3)

    const responseFrame = withRtuCrc(Uint8Array.from([0x01, 0x03, 0x04, 0x00, 0x2a, 0x00, 0x2b]))
    const res = decodeResponseRtu(responseFrame)
    expect(res.success).toBe(true)
    expect(res.registers).toEqual([42, 43])
  })

  it('encodes and decodes ASCII', () => {
    const req = encodeReadHoldingRegistersAscii({ unitId: 1, startAddress: 100, quantity: 2 })
    expect(String.fromCharCode(req[0])).toBe(':')

    const responseFrame = withAsciiLrc(Uint8Array.from([0x01, 0x03, 0x04, 0x00, 0x2a, 0x00, 0x2b]))
    const res = decodeResponseAscii(responseFrame)
    expect(res.success).toBe(true)
    expect(res.registers).toEqual([42, 43])
  })

  it('supports mode-based encode/decode helpers', () => {
    const tcpReq = encodeReadHoldingRegistersByMode({
      mode: 'tcp',
      transactionId: 1,
      unitId: 1,
      startAddress: 0,
      quantity: 1,
    })
    expect(tcpReq[7]).toBe(3)

    const rtuRes = decodeResponseByMode(
      withRtuCrc(Uint8Array.from([0x01, 0x03, 0x02, 0x00, 0x2a])),
      'rtu',
    )
    expect(rtuRes.registers).toEqual([42])

    const coilReq = encodeReadCoilsByMode({
      mode: 'tcp',
      transactionId: 2,
      unitId: 1,
      startAddress: 0,
      quantity: 8,
    })
    expect(coilReq[7]).toBe(1)

    const discreteReq = encodeReadDiscreteInputsByMode({
      mode: 'tcp',
      transactionId: 3,
      unitId: 1,
      startAddress: 0,
      quantity: 8,
    })
    expect(discreteReq[7]).toBe(2)

    const writeSingleCoilReq = encodeWriteSingleCoilByMode({
      mode: 'ascii',
      transactionId: 1,
      unitId: 1,
      address: 10,
      value: true,
    })
    expect(String.fromCharCode(writeSingleCoilReq[0])).toBe(':')
  })
})
