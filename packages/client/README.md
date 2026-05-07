# @modbus-ts/client

面向业务侧的统一 ModbusClient API。

## 核心导出

- ModbusClientOptions
- ClientEvent
- ModbusClient

## 最小示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'

const client = new ModbusClient({ transport: new TcpTransport({ host: '127.0.0.1', port: 502 }) })
await client.connect()
await client.readHoldingRegisters(0, 2)
```

## 组合示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { UdpTransport } from '@modbus-ts/transport-udp'
import { decodeFloat32 } from '@modbus-ts/codec'

const client = new ModbusClient({
  transport: new UdpTransport({ host: '127.0.0.1', port: 502 }),
  mode: 'rtu',
})
await client.connect()
const regs = await client.readHoldingRegisters(100, 2)
console.log('value', decodeFloat32(regs))
```

## 开发命令

- pnpm --filter @modbus-ts/client build
- pnpm --filter @modbus-ts/client test
- pnpm --filter @modbus-ts/client typecheck
