# @modbus-ts/core

平台无关的核心类型、接口、请求任务模型与标准错误定义。

## 核心导出

- ConnectionState
- Transport
- ModbusRequest
- ModbusResponse
- RequestTask
- Subscription
- TimeoutError
- ConnectionClosedError
- ProtocolError
- TransportError

## 最小示例

```ts
import { TimeoutError, type Transport } from '@modbus-ts/core'

const ensureTransport = (t: Transport): Transport => t

void ensureTransport({
  async connect() {},
  async close() {},
  async send(_data) {},
  onData() {},
  onClose() {},
})

throw new TimeoutError('request timeout')
```

## 组合示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'
import { TimeoutError, ConnectionClosedError } from '@modbus-ts/core'

const client = new ModbusClient({
  transport: new TcpTransport({ host: '127.0.0.1', port: 502 }),
})

try {
  await client.connect()
  await client.readHoldingRegisters(0, 2)
} catch (err) {
  if (err instanceof TimeoutError || err instanceof ConnectionClosedError) {
    console.error('recoverable transport/core error', err.message)
  }
}
```

## 开发命令

- pnpm --filter @modbus-ts/core build
- pnpm --filter @modbus-ts/core test
- pnpm --filter @modbus-ts/core typecheck
