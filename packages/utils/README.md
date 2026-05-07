# @modbus-ts/utils

通用工具函数集合。

## 核心导出

- sleep
- Deferred
- areArraysEqual

## 最小示例

```ts
import { sleep, areArraysEqual } from '@modbus-ts/utils'

await sleep(10)
console.log(areArraysEqual([1, 2], [1, 2]))
```

## 组合示例

```ts
import { Deferred, areArraysEqual } from '@modbus-ts/utils'

const gate = new Deferred<void>()
setTimeout(() => gate.resolve(), 100)
await gate.promise

const changed = !areArraysEqual([1, 2], [1, 3])
console.log('changed', changed)
```

## 开发命令

- pnpm --filter @modbus-ts/utils build
- pnpm --filter @modbus-ts/utils test
- pnpm --filter @modbus-ts/utils typecheck
