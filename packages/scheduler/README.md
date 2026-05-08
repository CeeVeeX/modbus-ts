# @modbus-ts/scheduler

Serial request scheduler with priority and timeout control.

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

## Dev

```bash
pnpm --filter @modbus-ts/scheduler test
```
