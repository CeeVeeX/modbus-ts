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
await client.writeMultipleRegisters(10, [1, 2, 3, 4])
await client.close()
```

## Events

- connect
- disconnect
- timeout
- error

## Dev

```bash
pnpm --filter @modbus-ts/client test
```
