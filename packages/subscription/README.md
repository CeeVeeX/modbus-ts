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

## Quick Links to Other Packages

<!-- package-links:start -->

- [@modbus-ts/client](https://www.npmjs.com/package/@modbus-ts/client)
- [@modbus-ts/codec](https://www.npmjs.com/package/@modbus-ts/codec)
- [@modbus-ts/core](https://www.npmjs.com/package/@modbus-ts/core)
- [@modbus-ts/electron-ipc-bridge](https://www.npmjs.com/package/@modbus-ts/electron-ipc-bridge)
- [@modbus-ts/gateway](https://www.npmjs.com/package/@modbus-ts/gateway)
- [@modbus-ts/protocol](https://www.npmjs.com/package/@modbus-ts/protocol)
- [@modbus-ts/scheduler](https://www.npmjs.com/package/@modbus-ts/scheduler)
- [@modbus-ts/transport-electron-ipc](https://www.npmjs.com/package/@modbus-ts/transport-electron-ipc)
- [@modbus-ts/transport-tcp](https://www.npmjs.com/package/@modbus-ts/transport-tcp)
- [@modbus-ts/transport-udp](https://www.npmjs.com/package/@modbus-ts/transport-udp)
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
