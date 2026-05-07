# @modbus-ts/transport-udp

Node.js UDP Transport，适配 Modbus UDP 通信场景。

## 核心导出

- UdpTransportOptions
- UdpTransport

## 最小示例

```ts
import { UdpTransport } from '@modbus-ts/transport-udp'

const transport = new UdpTransport({ host: '127.0.0.1', port: 502 })
await transport.connect()
await transport.send(Uint8Array.from([1, 3, 0, 0, 0, 1, 0, 0]))
```

## 组合示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { UdpTransport } from '@modbus-ts/transport-udp'

const client = new ModbusClient({
  transport: new UdpTransport({ host: '127.0.0.1', port: 502 }),
  mode: 'ascii',
  defaultUnitId: 1,
})

await client.connect()
await client.writeSingleRegister(10, 123)
```

## 开发命令

- pnpm --filter @modbus-ts/transport-udp build
- pnpm --filter @modbus-ts/transport-udp test
- pnpm --filter @modbus-ts/transport-udp typecheck
