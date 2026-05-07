export interface SwapOptions {
  byteSwap?: boolean
  wordSwap?: boolean
}

function applySwaps(bytes: Uint8Array, options: SwapOptions = {}): Uint8Array {
  const out = bytes.slice()

  if (options.byteSwap) {
    for (let i = 0; i < out.length; i += 2) {
      const a = out[i]
      out[i] = out[i + 1]
      out[i + 1] = a
    }
  }

  if (options.wordSwap) {
    const words: Uint8Array[] = []
    for (let i = 0; i < out.length; i += 2) {
      words.push(out.slice(i, i + 2))
    }
    words.reverse()
    return Uint8Array.from(words.flatMap((word) => [...word]))
  }

  return out
}

function fromRegisters(registers: number[]): Uint8Array {
  const out = new Uint8Array(registers.length * 2)
  const view = new DataView(out.buffer)
  registers.forEach((reg, index) => {
    view.setUint16(index * 2, reg)
  })
  return out
}

function toRegisters(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const out: number[] = []
  for (let i = 0; i < bytes.length; i += 2) {
    out.push(view.getUint16(i))
  }
  return out
}

export function decodeUint16(registers: number[]): number {
  return registers[0] ?? 0
}

export function decodeInt16(registers: number[]): number {
  const view = new DataView(new ArrayBuffer(2))
  view.setUint16(0, registers[0] ?? 0)
  return view.getInt16(0)
}

export function decodeUint32(registers: number[], options?: SwapOptions): number {
  const bytes = applySwaps(fromRegisters(registers.slice(0, 2)), options)
  const view = new DataView(bytes.buffer)
  return view.getUint32(0)
}

export function decodeInt32(registers: number[], options?: SwapOptions): number {
  const bytes = applySwaps(fromRegisters(registers.slice(0, 2)), options)
  const view = new DataView(bytes.buffer)
  return view.getInt32(0)
}

export function decodeFloat32(registers: number[], options?: SwapOptions): number {
  const bytes = applySwaps(fromRegisters(registers.slice(0, 2)), options)
  const view = new DataView(bytes.buffer)
  return view.getFloat32(0)
}

export function decodeFloat64(registers: number[], options?: SwapOptions): number {
  const bytes = applySwaps(fromRegisters(registers.slice(0, 4)), options)
  const view = new DataView(bytes.buffer)
  return view.getFloat64(0)
}

export function encodeFloat32(value: number, options?: SwapOptions): number[] {
  const bytes = new Uint8Array(4)
  const view = new DataView(bytes.buffer)
  view.setFloat32(0, value)
  return toRegisters(applySwaps(bytes, options))
}

export function encodeFloat64(value: number, options?: SwapOptions): number[] {
  const bytes = new Uint8Array(8)
  const view = new DataView(bytes.buffer)
  view.setFloat64(0, value)
  return toRegisters(applySwaps(bytes, options))
}
