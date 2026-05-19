# @modbus-ts/codec

Industrial register codec helpers with byte and word swap support.

## Installation

```bash
pnpm add @modbus-ts/codec
```

## Core Exports

- SwapOptions
- decodeUint16 / decodeInt16
- decodeUint32 / decodeInt32
- decodeFloat32 / decodeFloat64
- encodeFloat32 / encodeFloat64
- encodeAsciiString / decodeAsciiString

## Minimal Example

```ts
import {
  decodeAsciiString,
  decodeFloat32,
  encodeAsciiString,
  encodeFloat32,
} from '@modbus-ts/codec'

const regs = encodeFloat32(12.5, { wordSwap: true })
const value = decodeFloat32(regs, { wordSwap: true })

const textRegs = encodeAsciiString('HELLO', { padByte: 0x20 })
const text = decodeAsciiString(textRegs)
```

## Notes

- Use byteSwap and wordSwap to match PLC memory layout
- Helpers operate directly on Modbus register arrays

## Packages

- <a href="https://www.npmjs.com/package/@modbus-ts/client" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/client?label=@modbus-ts/client"></a> high-level Modbus client
- <a href="https://www.npmjs.com/package/@modbus-ts/core" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/core?label=@modbus-ts/core"></a> shared contracts, types, and errors
- <a href="https://www.npmjs.com/package/@modbus-ts/protocol" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/protocol?label=@modbus-ts/protocol"></a> FC1/FC2/FC3/FC4/FC5/FC6/FC15/FC16 frame encode/decode for TCP/RTU/ASCII
- <a href="https://www.npmjs.com/package/@modbus-ts/scheduler" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/scheduler?label=@modbus-ts/scheduler"></a> serial request queue with priority
- <a href="https://www.npmjs.com/package/@modbus-ts/subscription" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/subscription?label=@modbus-ts/subscription"></a> polling engine and range merge
- <a href="https://www.npmjs.com/package/@modbus-ts/transport-tcp" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/transport-tcp?label=@modbus-ts/transport-tcp"></a> Node TCP transport with reconnect
- <a href="https://www.npmjs.com/package/@modbus-ts/transport-udp" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/transport-udp?label=@modbus-ts/transport-udp"></a> Node UDP transport
- <a href="https://www.npmjs.com/package/@modbus-ts/transport-ws" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/transport-ws?label=@modbus-ts/transport-ws"></a> browser WebSocket transport with reconnect
- <a href="https://www.npmjs.com/package/@modbus-ts/electron-ipc-bridge" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/electron-ipc-bridge?label=@modbus-ts/electron-ipc-bridge"></a> typed Electron main/renderer bridge
- <a href="https://www.npmjs.com/package/@modbus-ts/transport-electron-ipc" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/transport-electron-ipc?label=@modbus-ts/transport-electron-ipc"></a> Electron IPC transport adapter
- <a href="https://www.npmjs.com/package/@modbus-ts/gateway" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/gateway?label=@modbus-ts/gateway"></a> WebSocket to TCP binary relay gateway
- <a href="https://www.npmjs.com/package/@modbus-ts/codec" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/codec?label=@modbus-ts/codec"></a> register-value codec helpers
- <a href="https://www.npmjs.com/package/@modbus-ts/utils" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/utils?label=@modbus-ts/utils"></a> shared async and comparison utilities
