# @modbus-ts/protocol

Modbus frame encoder/decoder for TCP, RTU, and ASCII.

## Installation

```bash
pnpm add @modbus-ts/protocol
```

## Core Exports

- ModbusWireMode
- encodeReadHoldingRegisters / encodeReadHoldingRegistersByMode
- encodeWriteSingleRegister / encodeWriteSingleRegisterByMode
- encodeWriteMultipleRegisters / encodeWriteMultipleRegistersByMode
- decodeResponse / decodeResponseByMode

## Minimal Example

```ts
import { decodeResponseByMode, encodeReadHoldingRegistersByMode } from '@modbus-ts/protocol'

const request = encodeReadHoldingRegistersByMode({
  mode: 'rtu',
  transactionId: 1,
  unitId: 1,
  startAddress: 0,
  quantity: 2,
})

const response = decodeResponseByMode(new Uint8Array([1, 3, 4, 0, 1, 0, 2, 42, 57]), 'rtu')
```

## Supported Function Codes

- FC1 Read Coils
- FC2 Read Discrete Inputs
- FC3 Read Holding Registers
- FC4 Read Input Registers
- FC5 Write Single Coil
- FC6 Write Single Register
- FC15 Write Multiple Coils
- FC16 Write Multiple Registers

## Point Mapping

| Function Code | Data Type          | Read/Write | Typical API in client  |
| ------------- | ------------------ | ---------- | ---------------------- |
| FC1           | Coils              | Read       | readCoils              |
| FC2           | Discrete Inputs    | Read       | readDiscreteInputs     |
| FC3           | Holding Registers  | Read       | readHoldingRegisters   |
| FC4           | Input Registers    | Read       | readInputRegisters     |
| FC5           | Single Coil        | Write      | writeSingleCoil        |
| FC6           | Single Register    | Write      | writeSingleRegister    |
| FC15          | Multiple Coils     | Write      | writeMultipleCoils     |
| FC16          | Multiple Registers | Write      | writeMultipleRegisters |

## Packages

- <a href="https://www.npmjs.com/package/@modbus-ts/client" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/client?label=@modbus-ts/client"></a>: high-level Modbus client
- <a href="https://www.npmjs.com/package/@modbus-ts/core" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/core?label=@modbus-ts/core"></a>: shared contracts, types, and errors
- <a href="https://www.npmjs.com/package/@modbus-ts/protocol" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/protocol?label=@modbus-ts/protocol"></a>: FC1/FC2/FC3/FC4/FC5/FC6/FC15/FC16 frame encode/decode for TCP/RTU/ASCII
- <a href="https://www.npmjs.com/package/@modbus-ts/scheduler" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/scheduler?label=@modbus-ts/scheduler"></a>: serial request queue with priority
- <a href="https://www.npmjs.com/package/@modbus-ts/subscription" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/subscription?label=@modbus-ts/subscription"></a>: polling engine and range merge
- <a href="https://www.npmjs.com/package/@modbus-ts/transport-tcp" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/transport-tcp?label=@modbus-ts/transport-tcp"></a>: Node TCP transport with reconnect
- <a href="https://www.npmjs.com/package/@modbus-ts/transport-udp" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/transport-udp?label=@modbus-ts/transport-udp"></a>: Node UDP transport
- <a href="https://www.npmjs.com/package/@modbus-ts/transport-ws" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/transport-ws?label=@modbus-ts/transport-ws"></a>: browser WebSocket transport with reconnect
- <a href="https://www.npmjs.com/package/@modbus-ts/electron-ipc-bridge" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/electron-ipc-bridge?label=@modbus-ts/electron-ipc-bridge"></a>: typed Electron main/renderer bridge
- <a href="https://www.npmjs.com/package/@modbus-ts/transport-electron-ipc" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/transport-electron-ipc?label=@modbus-ts/transport-electron-ipc"></a>: Electron IPC transport adapter
- <a href="https://www.npmjs.com/package/@modbus-ts/gateway" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/gateway?label=@modbus-ts/gateway"></a>: WebSocket to TCP binary relay gateway
- <a href="https://www.npmjs.com/package/@modbus-ts/codec" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/codec?label=@modbus-ts/codec"></a>: register-value codec helpers
- <a href="https://www.npmjs.com/package/@modbus-ts/utils" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@modbus-ts/utils?label=@modbus-ts/utils"></a>: shared async and comparison utilities
