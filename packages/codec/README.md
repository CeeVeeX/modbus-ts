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

## Quick Links to Other Packages

<!-- package-links:start -->

- [@modbus-ts/client](https://www.npmjs.com/package/@modbus-ts/client)
- [@modbus-ts/core](https://www.npmjs.com/package/@modbus-ts/core)
- [@modbus-ts/electron-ipc-bridge](https://www.npmjs.com/package/@modbus-ts/electron-ipc-bridge)
- [@modbus-ts/gateway](https://www.npmjs.com/package/@modbus-ts/gateway)
- [@modbus-ts/protocol](https://www.npmjs.com/package/@modbus-ts/protocol)
- [@modbus-ts/scheduler](https://www.npmjs.com/package/@modbus-ts/scheduler)
- [@modbus-ts/subscription](https://www.npmjs.com/package/@modbus-ts/subscription)
- [@modbus-ts/transport-electron-ipc](https://www.npmjs.com/package/@modbus-ts/transport-electron-ipc)
- [@modbus-ts/transport-tcp](https://www.npmjs.com/package/@modbus-ts/transport-tcp)
- [@modbus-ts/transport-udp](https://www.npmjs.com/package/@modbus-ts/transport-udp)
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
