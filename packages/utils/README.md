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
