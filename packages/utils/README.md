# @modbus-ts/utils

Small utility helpers shared by modbus-ts packages.

## Core Exports

- sleep
- Deferred
- areArraysEqual

## Minimal Example

```ts
import { Deferred, areArraysEqual, sleep } from '@modbus-ts/utils'

const gate = new Deferred<void>()
setTimeout(() => gate.resolve(), 100)
await gate.promise

await sleep(50)
const same = areArraysEqual([1, 2], [1, 2])
```

## Usage Notes

- Deferred is useful for bridging callback events to async flows
- areArraysEqual is used by subscription change detection

## Dev

```bash
pnpm --filter @modbus-ts/utils test
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
- [@modbus-ts/subscription](https://www.npmjs.com/package/@modbus-ts/subscription)
- [@modbus-ts/transport-electron-ipc](https://www.npmjs.com/package/@modbus-ts/transport-electron-ipc)
- [@modbus-ts/transport-tcp](https://www.npmjs.com/package/@modbus-ts/transport-tcp)
- [@modbus-ts/transport-udp](https://www.npmjs.com/package/@modbus-ts/transport-udp)
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
<!-- package-links:end -->
