# @modbus-ts/scheduler

单连接串行任务调度器，支持优先级队列与超时控制。

## 核心导出

- PRIORITY
- RequestScheduler

## 最小示例

```ts
import { PRIORITY, RequestScheduler } from '@modbus-ts/scheduler'

const scheduler = new RequestScheduler()
console.log(PRIORITY.write, PRIORITY.read, PRIORITY.polling)

scheduler.close(new Error('shutdown'))
```

## 组合示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'

const client = new ModbusClient({
  transport: new TcpTransport({ host: '127.0.0.1', port: 502 }),
  defaultUnitId: 1,
})

await client.connect()
void client.readHoldingRegisters(0, 5, { priority: 50 })
await client.writeSingleRegister(10, 123, { priority: 100 })
```

## 开发命令

- pnpm --filter @modbus-ts/scheduler build
- pnpm --filter @modbus-ts/scheduler test
- pnpm --filter @modbus-ts/scheduler typecheck
