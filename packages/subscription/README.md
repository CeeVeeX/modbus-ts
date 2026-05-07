# @modbus-ts/subscription

订阅轮询引擎，支持区间合并、去重、裁切与变更检测。

## 核心导出

- SubscriptionGroup
- MergedRange
- PollGroup
- SubscriptionEngine

## 最小示例

```ts
import { SubscriptionEngine } from '@modbus-ts/subscription'

const engine = new SubscriptionEngine({
  readRegisters: async ({ start, length }) => new Array(length).fill(start),
  onError: (err) => console.error(err),
})

engine.start()
```

## 组合示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'

const client = new ModbusClient({ transport: new TcpTransport({ host: '127.0.0.1', port: 502 }) })
await client.connect()

const unsubscribeA = client.subscribe({ start: 0, length: 3, interval: 500, callback: console.log })
const unsubscribeB = client.subscribe({ start: 3, length: 2, interval: 500, callback: console.log })

setTimeout(() => {
  unsubscribeA()
  unsubscribeB()
}, 5000)
```

## 开发命令

- pnpm --filter @modbus-ts/subscription build
- pnpm --filter @modbus-ts/subscription test
- pnpm --filter @modbus-ts/subscription typecheck
