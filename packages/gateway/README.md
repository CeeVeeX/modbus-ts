# @modbus-ts/gateway

WebSocket 到 TCP 的二进制 relay 网关，不解析 Modbus 语义。

## 核心导出

- GatewayOptions
- ModbusGateway

## 最小示例

```ts
import { ModbusGateway } from '@modbus-ts/gateway'

const gateway = new ModbusGateway({ wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 })
await gateway.start()
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
```

## 开发命令

- pnpm --filter @modbus-ts/gateway build
- pnpm --filter @modbus-ts/gateway test
- pnpm --filter @modbus-ts/gateway typecheck
