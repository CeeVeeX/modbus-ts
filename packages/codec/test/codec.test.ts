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

  it('supports fixed length output with padding', () => {
    // "TEXT" 占用 2 个寄存器，指定长度 10，剩余 8 个用 0 填充
    const result = encodeAsciiString('TEXT', { length: 10 })
    expect(result).toHaveLength(10)
    expect(result[0]).toBe(0x5445) // 'T' 'E'
    expect(result[1]).toBe(0x5854) // 'X' 'T'
    // 剩余 8 个寄存器应该都是 0x0000
    for (let i = 2; i < 10; i++) {
      expect(result[i]).toBe(0x0000)
    }
  })

  it('fixed length uses padByte for unused registers', () => {
    // 使用空格 (0x20) 作为填充字节
    const result = encodeAsciiString('AB', { length: 5, padByte: 0x20 })
    expect(result).toHaveLength(5)
    expect(result[0]).toBe(0x4142) // 'A' 'B'
    // 剩余 4 个寄存器应该都是 0x2020（空格+空格）
    for (let i = 1; i < 5; i++) {
      expect(result[i]).toBe(0x2020)
    }
  })

  it('fixed length ignores when smaller than required', () => {
    // "ABCDEFGHIJ" 需要 5 个寄存器，即使指定长度为 3，也返回 5 个（默认不截断）
    const result = encodeAsciiString('ABCDEFGHIJ', { length: 3 })
    expect(result).toHaveLength(5)
    expect(result).toEqual([0x4142, 0x4344, 0x4546, 0x4748, 0x494a])
  })

  it('truncates string when truncate option is enabled', () => {
    // "ABCDEFGHIJ" (10字符) 指定 length: 3 且 truncate: true，只保留前 6 个字符
    const result = encodeAsciiString('ABCDEFGHIJ', { length: 3, truncate: true })
    expect(result).toHaveLength(3)
    expect(result).toEqual([0x4142, 0x4344, 0x4546]) // 'ABCDEF'
  })

  it('truncate with odd character count pads last register', () => {
    // "ABCDE" (5字符) 指定 length: 2 且 truncate: true，保留前 4 个字符
    const result = encodeAsciiString('ABCDE', { length: 2, truncate: true })
    expect(result).toHaveLength(2)
    expect(result).toEqual([0x4142, 0x4344]) // 'ABCD'
  })

  it('truncate does not affect strings within length limit', () => {
    // "AB" (2字符) 指定 length: 5 且 truncate: true，不需要截断
    const result = encodeAsciiString('AB', { length: 5, truncate: true })
    expect(result).toHaveLength(5)
    expect(result[0]).toBe(0x4142) // 'AB'
    for (let i = 1; i < 5; i++) {
      expect(result[i]).toBe(0x0000) // 填充
    }
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
