# @modbus-ts/client

High-level Modbus client API for read, write, and subscribe.

## Installation

```bash
pnpm add @modbus-ts/client
```

## Core Exports

- ModbusClient
- ModbusClientOptions
- ClientEvent

## Minimal Example

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'

const client = new ModbusClient({
  transport: new TcpTransport({ host: '127.0.0.1', port: 502 }),
  defaultUnitId: 1,
  defaultTimeout: 1000,
  mode: 'tcp',
})

await client.connect()
const regs = await client.readHoldingRegisters(0, 4)
const inputRegs = await client.readInputRegisters(0, 4)
const coils = await client.readCoils(0, 8)
const discreteInputs = await client.readDiscreteInputs(0, 8)

await client.writeMultipleRegisters(10, [1, 2, 3, 4])
await client.writeSingleCoil(11, true)
await client.writeMultipleCoils(12, [true, false, true])

console.log({ regs, inputRegs, coils, discreteInputs })
await client.close()
```

## Events

- connect
- disconnect
- timeout
- error

## Point Mapping

| Point Type        | Function Code | Read API             | Write API                                    |
| ----------------- | ------------- | -------------------- | -------------------------------------------- |
| Coils             | FC1/FC5/FC15  | readCoils            | writeSingleCoil / writeMultipleCoils         |
| Discrete Inputs   | FC2           | readDiscreteInputs   | Not supported by Modbus spec                 |
| Holding Registers | FC3/FC6/FC16  | readHoldingRegisters | writeSingleRegister / writeMultipleRegisters |
| Input Registers   | FC4           | readInputRegisters   | Not supported by Modbus spec                 |

## API Selection Guide

- Use readCoils for digital output status bits.
- Use readDiscreteInputs for read-only digital input bits.
- Use readHoldingRegisters for writable word registers.
- Use readInputRegisters for read-only word registers.

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
