# @modbus-ts/client

High-level Modbus client API for read, write, and subscribe.

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

## Dev

```bash
pnpm --filter @modbus-ts/client test
```

## Quick Links to Other Packages

<!-- package-links:start -->

- [@modbus-ts/codec](https://www.npmjs.com/package/@modbus-ts/codec)
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
