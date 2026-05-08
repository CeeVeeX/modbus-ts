# @modbus-ts/codec

Industrial register codec helpers with byte and word swap support.

## Core Exports

- SwapOptions
- decodeUint16 / decodeInt16
- decodeUint32 / decodeInt32
- decodeFloat32 / decodeFloat64
- encodeFloat32 / encodeFloat64

## Minimal Example

```ts
import { decodeFloat32, encodeFloat32 } from '@modbus-ts/codec'

const regs = encodeFloat32(12.5, { wordSwap: true })
const value = decodeFloat32(regs, { wordSwap: true })
```

## Notes

- Use byteSwap and wordSwap to match PLC memory layout
- Helpers operate directly on Modbus register arrays

## Dev

```bash
pnpm --filter @modbus-ts/codec test
```
