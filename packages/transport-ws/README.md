# @modbus-ts/transport-ws

Browser WebSocket Transport，支持自动重连与帧缓存。

## 核心导出

- WsTransportOptions
- WsTransport

## 最小示例

```ts
import { WsTransport } from '@modbus-ts/transport-ws'

const transport = new WsTransport({ url: 'ws://127.0.0.1:18080' })
transport.onData((frame) => console.log('frame', frame.length))
await transport.connect()
```

## 组合示例

```ts
import { ModbusGateway } from '@modbus-ts/gateway'
import { ModbusClient } from '@modbus-ts/client'
import { WsTransport } from '@modbus-ts/transport-ws'

const gateway = new ModbusGateway({ wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 })
await gateway.start()

const client = new ModbusClient({ transport: new WsTransport({ url: 'ws://127.0.0.1:18080' }) })
await client.connect()
console.log(await client.readHoldingRegisters(0, 2))
```

## 开发命令

- pnpm --filter @modbus-ts/transport-ws build
- pnpm --filter @modbus-ts/transport-ws test
- pnpm --filter @modbus-ts/transport-ws typecheck
