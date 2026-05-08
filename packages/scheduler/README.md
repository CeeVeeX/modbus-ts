# @modbus-ts/scheduler

Serial request scheduler with priority and timeout control.

## Installation

```bash
pnpm add @modbus-ts/scheduler
```

## Core Exports

- PRIORITY
- RequestScheduler

## Minimal Example

```ts
import { PRIORITY, RequestScheduler } from '@modbus-ts/scheduler'

const scheduler = new RequestScheduler()

const value = await scheduler.schedule({
  id: 1,
  priority: PRIORITY.read,
  timeout: 1000,
  execute: async () => 42,
  resolve: () => {},
  reject: () => {},
})
```

## Behavior

- One in-flight task at a time
- Higher priority runs first
- TimeoutError for expired tasks
- clearPending and close to fail queued tasks

## Quick Links to Other Packages

<!-- package-links:start -->

- [@modbus-ts/client](https://www.npmjs.com/package/@modbus-ts/client)
- [@modbus-ts/codec](https://www.npmjs.com/package/@modbus-ts/codec)
- [@modbus-ts/core](https://www.npmjs.com/package/@modbus-ts/core)
- [@modbus-ts/electron-ipc-bridge](https://www.npmjs.com/package/@modbus-ts/electron-ipc-bridge)
- [@modbus-ts/gateway](https://www.npmjs.com/package/@modbus-ts/gateway)
- [@modbus-ts/protocol](https://www.npmjs.com/package/@modbus-ts/protocol)
- [@modbus-ts/subscription](https://www.npmjs.com/package/@modbus-ts/subscription)
- [@modbus-ts/transport-electron-ipc](https://www.npmjs.com/package/@modbus-ts/transport-electron-ipc)
- [@modbus-ts/transport-tcp](https://www.npmjs.com/package/@modbus-ts/transport-tcp)
- [@modbus-ts/transport-udp](https://www.npmjs.com/package/@modbus-ts/transport-udp)
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
