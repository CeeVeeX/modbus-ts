# @modbus-ts/subscription

Polling subscription engine with range merge and change detection.

## Core Exports

- SubscriptionGroup
- MergedRange
- PollGroup
- SubscriptionEngine

## Minimal Example

```ts
import { SubscriptionEngine } from '@modbus-ts/subscription'

const engine = new SubscriptionEngine({
  readRegisters: async ({ start, length }) => new Array(length).fill(start),
})

const unsubscribe = engine.subscribe({
  unitId: 1,
  start: 0,
  length: 4,
  interval: 500,
  callback: (registers) => console.log(registers),
})

engine.start()
unsubscribe()
engine.stop()
```

## Behavior

- Groups subscriptions by interval
- Merges overlapping ranges per unitId
- Calls callback only when values changed

## Dev

```bash
pnpm --filter @modbus-ts/subscription test
```
