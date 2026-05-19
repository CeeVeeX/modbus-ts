import { describe, expect, it } from 'vitest'
import {
  decodeAsciiString,
  decodeFloat32,
  decodeFloat64,
  decodeInt16,
  decodeInt32,
  decodeUint16,
  decodeUint32,
  encodeAsciiString,
  encodeFloat32,
  encodeFloat64,
} from '../src/index'

describe('codec', () => {
  it('encodes and decodes float32', () => {
    const regs = encodeFloat32(12.5)
    const value = decodeFloat32(regs)
    expect(value).toBeCloseTo(12.5, 5)
  })

  it('supports word swap', () => {
    const normal = encodeFloat32(1.25)
    const swapped = encodeFloat32(1.25, { wordSwap: true })
    expect(swapped).not.toEqual(normal)
    expect(decodeFloat32(swapped, { wordSwap: true })).toBeCloseTo(1.25, 5)
  })

  it('supports byte swap and mixed swaps', () => {
    const regs = encodeFloat32(3.5, { byteSwap: true, wordSwap: true })
    const decoded = decodeFloat32(regs, { byteSwap: true, wordSwap: true })
    expect(decoded).toBeCloseTo(3.5, 5)
  })

  it('covers integer decoders and defaults', () => {
    expect(decodeUint16([])).toBe(0)
    expect(decodeUint16([0x1234])).toBe(0x1234)

    expect(decodeInt16([0xffff])).toBe(-1)
    expect(decodeUint32([0x1234, 0x5678])).toBe(0x12345678)
    expect(decodeInt32([0xffff, 0xfffe])).toBe(-2)
  })

  it('encodes and decodes float64', () => {
    const regs = encodeFloat64(1234.5678)
    expect(decodeFloat64(regs)).toBeCloseTo(1234.5678, 8)

    const swapped = encodeFloat64(9.25, { wordSwap: true })
    expect(decodeFloat64(swapped, { wordSwap: true })).toBeCloseTo(9.25, 8)
  })

  it('encodes ASCII string to holding registers', () => {
    expect(encodeAsciiString('ABCD')).toEqual([0x4142, 0x4344])
    expect(encodeAsciiString('ABC')).toEqual([0x4142, 0x4300])
    expect(encodeAsciiString('ABC', { padByte: 0x20 })).toEqual([0x4142, 0x4320])
  })

  it('validates ASCII and byte range options', () => {
    expect(() => encodeAsciiString('A中')).toThrow('non-ASCII character')
    expect(() => encodeAsciiString('A中', { asciiOnly: false })).toThrow('range 0..255')
    expect(() => encodeAsciiString('A', { padByte: 300 })).toThrow('range 0..255')
  })

  it('decodes ASCII registers with trailing null trim by default', () => {
    expect(decodeAsciiString([0x4142, 0x4300])).toBe('ABC')
    expect(decodeAsciiString([0x4142, 0x0000])).toBe('AB')
  })

  it('supports decode options', () => {
    expect(decodeAsciiString([0x4142, 0x4300], { trimTrailingNull: false })).toBe('ABC\u0000')
    expect(() => decodeAsciiString([0x41ff])).toThrow('non-ASCII byte')
    expect(decodeAsciiString([0x41ff], { asciiOnly: false })).toBe('Aÿ')
  })
})
