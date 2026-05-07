# TypeScript Modbus Runtime

工业级、可扩展、ESM First 的 Modbus Runtime，支持 Node TCP 与 Browser WebSocket Gateway。

## Features

- Modbus TCP (FC3 / FC4 / FC6 / FC16)
- Node TCP transport
- Browser WebSocket transport
- WebSocket -> TCP gateway (binary relay)
- Read / Write / Subscription polling
- Subscription 自动报文合并 + 去重 + change detection
- 单连接串行调度 + priority queue + timeout control
- reconnect（TCP/WS transport）
- transport 抽象（仅 `Uint8Array`）

## Architecture

```text
apps/
  node-tcp-example/
  node-udp-example/
  browser-example/

packages/
  core/            # 平台无关接口与错误定义
  protocol/        # Modbus TCP 编解码
  scheduler/       # 单连接串行 + 优先级 + timeout
  subscription/    # polling + merge + slice + dedupe + change detection
  transport-tcp/   # Node net transport + frame assembler + reconnect
  transport-udp/   # Node dgram transport（可配 RTU / ASCII）
  transport-ws/    # Browser WebSocket transport + reconnect
  client/          # 用户 API，组合 transport/protocol/scheduler/subscription
  gateway/         # ws <-> tcp binary relay + tcp connection pool
  codec/           # 工业数据编解码（swap 支持）
  utils/           # 通用工具
```

## Package Dependency Graph

```text
@modbus-ts/core
  ├─> @modbus-ts/protocol
  ├─> @modbus-ts/scheduler
  ├─> @modbus-ts/subscription
  │     └─> @modbus-ts/utils
  ├─> @modbus-ts/transport-tcp
  └─> @modbus-ts/transport-ws

@modbus-ts/client
  ├─> @modbus-ts/core
  ├─> @modbus-ts/protocol
  ├─> @modbus-ts/scheduler
  ├─> @modbus-ts/subscription
  └─> @modbus-ts/utils

@modbus-ts/gateway
  └─> @modbus-ts/utils
```

## Quick Start

### 1. Install

```bash
pnpm install
```

### 2. Build

```bash
pnpm build
```

### 3. Test

```bash
pnpm test
pnpm test:coverage
```

### 4. Node Example

```bash
pnpm --filter @modbus-ts/node-tcp-example dev
```

### 5. Node UDP Example

```bash
pnpm --filter @modbus-ts/node-udp-example dev
```

UDP 高级能力演示：

```bash
pnpm --filter @modbus-ts/node-udp-example dev:advanced
```

### 6. Node Advanced Example（合并 / 去重 / 调度 / 订阅轮询）

```bash
pnpm --filter @modbus-ts/node-tcp-example dev:advanced
```

## Browser Usage

1. 启动 gateway：

```ts
import { ModbusGateway } from '@modbus-ts/gateway'

const gateway = new ModbusGateway({
  wsPort: 18080,
  plcHost: '127.0.0.1',
  plcPort: 502,
})

await gateway.start()
```

2. 启动浏览器 demo：

```bash
pnpm --filter @modbus-ts/browser-example dev
```

3. 浏览器端通过 `WsTransport` 连接 `ws://127.0.0.1:18080`，并可在页面按钮中直接触发：

- 重叠订阅合并
- 重复订阅去重
- read/write 优先级差异
- polling 启停

## API Overview

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'

const transport = new TcpTransport({ host: '127.0.0.1', port: 502 })
const client = new ModbusClient({ transport, defaultUnitId: 1 })

await client.connect()

const values = await client.readHoldingRegisters(0, 4)
await client.writeSingleRegister(10, 123)

const unsubscribe = client.subscribe({
  start: 0,
  length: 2,
  interval: 500,
  callback: (regs) => console.log(regs),
})

unsubscribe()
await client.close()
```

## Advanced Example（突出核心能力）

代码位置：`apps/node-tcp-example/src/advanced.ts`

该示例会同时演示：

- 订阅轮询（500ms）
- 自动报文合并（0-2 与 3-4 会合并为一次读取）
- 重复订阅去重（两个 0-4 订阅只发一次底层请求）
- 单连接调度与优先级（write > read > polling）

运行：

```bash
pnpm --filter @modbus-ts/node-tcp-example dev:advanced
```

你会看到类似日志：

```text
[sub A 0-2] [...]
[sub B 3-4] [...]
[sub C 0-4] [...]
[sub D 0-4 dup] [...]
[manual read priority=read] [...]
[manual write priority=write] done
```

说明：

- A/B/C/D 的 callback 都会触发，但底层 polling 读请求会按 interval + 区间进行合并与去重。
- 手动 write 使用更高优先级，会在同一连接串行队列中优先于 read/polling 执行。

同类能力示例：

- Browser: `apps/browser-example/src/main.ts`（按钮交互触发）
- Node UDP: `apps/node-udp-example/src/advanced.ts`

## Subscription Merge Explain

同 interval 内，按 `unitId + 地址区间` 排序后线性合并（整体复杂度 `O(n log n)`）：

```text
sub1: start=0  length=3
sub2: start=3  length=2
=> merged read: 0-4
```

读取后按 offset 裁切回各订阅区间，且仅在数据变化时触发 callback。

## Reconnect Strategy

- `transport-tcp` / `transport-ws` 都使用指数回退重连。
- 连接断开时，scheduler 会 reject pending task。
- 重连后 `client` 保持 subscription engine 运行，polling 自动恢复。

## Timeout Strategy

- `@modbus-ts/scheduler` 对每个 task 使用 `Promise.race()` 包装 timeout。
- timeout 时抛出 `TimeoutError`，client 触发 `timeout` 事件。

## Engineering Standards

- Language: TypeScript
- Runtime: Node.js >= 20
- Package manager: pnpm
- Monorepo: pnpm workspace + turbo
- Build: tsup
- Module: ESM First
- Test: Vitest
- Coverage threshold: >= 80%（见 `vitest.config.ts`）

## Transport 接口

```ts
export interface Transport {
  connect(): Promise<void>

  close(): Promise<void>

  send(data: Uint8Array): Promise<void>

  onData(cb: (data: Uint8Array) => void): void

  onClose(cb: (err?: Error) => void): void
}
```

---

## ConnectionState

```ts
type ConnectionState = 'idle' | 'connecting' | 'connected' | 'closing' | 'closed' | 'reconnecting'
```

---

# Task 3：实现 @modbus-ts/protocol

## 目标

实现：

```text
Modbus TCP 编解码
```

---

## 范围

支持：

```text
FC3
FC4
FC6
FC16
```

---

## 要求

实现：

```ts
encodeReadHoldingRegisters()
encodeWriteSingleRegister()
decodeResponse()
```

---

## 必须支持

### MBAP Header

包括：

```text
transaction id
protocol id
length
unit id
```

---

## 输出

协议层统一：

```ts
Uint8Array
```

---

## 禁止

不得：

- 管 socket
- 管 timeout
- 管 retry

---

# Task 4：实现 @modbus-ts/transport-tcp

## 目标

Node TCP transport。

---

## 要求

使用：

```ts
node: net
```

---

## 实现

```ts
class TcpTransport implements Transport
```

---

## 必须支持

### connect

### reconnect

### close

### frame assembler

处理：

```text
TCP 粘包
半包
```

---

## 必须

```ts
socket.setNoDelay(true)
```

---

# Task 5：实现 @modbus-ts/scheduler

## 目标

实现：

```text
单连接串行任务调度器
```

---

## 核心原则

同一 socket：

```text
一次只能飞一个请求
```

---

## 功能

### priority queue

优先级：

```text
write > read > polling
```

建议：

```text
write: 100
read: 50
polling: 10
```

---

## timeout

必须：

```ts
Promise.race()
```

---

## reconnect 时

所有 pending task：

```text
必须 reject
```

---

## Scheduler API

```ts
schedule(task)
```

---

## Task 接口

```ts
interface RequestTask<T = any> {
  id: number

  priority: number

  timeout: number

  execute(): Promise<T>

  resolve(v: T): void

  reject(err: Error): void
}
```

---

# Task 6：实现 @modbus-ts/subscription

## 目标

实现：

```text
订阅轮询引擎
```

---

# 核心能力

## 1. 自动报文合并

例如：

```text
sub1:
  start=0
  length=3

sub2:
  start=3
  length=2
```

自动合并：

```text
read:
  0-4
```

---

## 2. 数据裁切

读取：

```text
0-4
```

返回：

```text
sub1 -> 0-2
sub2 -> 3-4
```

---

## 3. 重复订阅去重

例如：

```text
两个订阅都订阅 0-10
```

必须：

```text
只发送一个 modbus request
```

---

## 4. change detection

只有数据变化：

```text
才触发 callback
```

---

## 5. polling loop

禁止：

```ts
setInterval(async () => {})
```

必须：

```ts
while(running)
```

防止并发重叠。

---

# 数据结构要求

实现：

```ts
SubscriptionGroup
PollGroup
```

---

# PollGroup

按 interval 分组。

例如：

```text
100ms:
  0-10
  20-30

500ms:
  100-120
```

---

# Task 7：实现 @modbus-ts/client

## 目标

提供用户 API。

---

## API

### read

```ts
client.readHoldingRegisters()
```

---

### write

```ts
client.writeSingleRegister()
```

---

### subscribe

```ts
client.subscribe()
```

返回：

```ts
unsubscribe()
```

---

## 内部

必须组合：

```text
transport
scheduler
subscription
protocol
```

---

## reconnect 后

自动：

```text
恢复 polling
```

---

# Task 8：实现 @modbus-ts/transport-ws

## 目标

Browser transport。

---

## 功能

通过：

```text
WebSocket
```

转发：

```text
Modbus TCP Binary Frame
```

---

## 要求

实现：

```ts
class WsTransport implements Transport
```

---

# Task 9：实现 @modbus-ts/gateway

## 目标

实现：

```text
WebSocket -> TCP Gateway
```

---

## 架构

```text
Browser
  ↓ ws
Gateway
  ↓ tcp
PLC
```

---

## 功能

### websocket server

### tcp connection pool

### binary passthrough

---

## 禁止

gateway 不解析 modbus。

只做：

```text
binary relay
```

---

# Task 10：实现 @modbus-ts/codec

## 目标

实现工业数据编解码。

---

## 支持

### uint16

### int16

### uint32

### int32

### float32

### float64

---

## 支持

### word swap

### byte swap

---

## API

```ts
decodeFloat32()
encodeFloat32()
```

---

# Task 11：工程标准

## lint

ESLint。

---

## format

Prettier。

---

## test

Vitest。

---

## coverage

必须：

```text
>= 80%
```

---

# Task 12：性能要求

## Subscription Merge

必须：

```text
O(n log n)
```

---

## Scheduler

不得 busy loop。

---

## Polling

避免：

```text
timer drift
```

---

# Task 13：错误处理

统一错误类型：

```ts
TimeoutError
ConnectionClosedError
ProtocolError
TransportError
```

---

# Task 14：事件系统

client 必须支持：

```ts
client.on('connect')
client.on('disconnect')
client.on('timeout')
client.on('error')
```

---

# Task 15：示例

必须提供：

---

## Node TCP Example

```ts
read
write
subscribe
```

---

## Browser Example

```text
browser -> websocket -> gateway -> plc
```

---

# Task 16：README

必须包含：

- architecture
- package dependency graph
- quick start
- browser usage
- subscription merge explain
- reconnect strategy
- timeout strategy

---

# 最终目标

实现一个：

```text
工业级
高性能
可扩展
多 transport
支持订阅聚合
支持浏览器
支持 reconnect
支持优先级调度
```

的：

```text
TypeScript Modbus Runtime
```
