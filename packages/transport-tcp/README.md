# @modbus-ts/transport-tcp

Node.js TCP Transport，包含帧组装与断线重连能力。

## 核心导出

- TcpTransportOptions
- TcpTransport

## 最小示例

```ts
import { TcpTransport } from '@modbus-ts/transport-tcp'

const transport = new TcpTransport({ host: '127.0.0.1', port: 502 })
transport.onData((frame) => console.log('frame', frame.length))
await transport.connect()
await transport.send(Uint8Array.from([0, 1, 0, 0, 0, 6, 1, 3, 0, 0, 0, 1]))
```

## 组合示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'
import { decodeFloat32 } from '@modbus-ts/codec'

const client = new ModbusClient({ transport: new TcpTransport({ host: '127.0.0.1', port: 502 }) })
await client.connect()
const regs = await client.readHoldingRegisters(100, 2)
console.log('decoded', decodeFloat32(regs))
```

## 开发命令

- pnpm --filter @modbus-ts/transport-tcp build
- pnpm --filter @modbus-ts/transport-tcp test
- pnpm --filter @modbus-ts/transport-tcp typecheck
