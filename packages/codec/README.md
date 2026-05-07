# @modbus-ts/codec

工业寄存器数据编解码工具，支持 byte/word swap。

## 核心导出

- SwapOptions
- decodeUint16/int16/uint32/int32/float32/float64
- encodeFloat32
- encodeFloat64

## 最小示例

```ts
import { decodeFloat32, encodeFloat32 } from '@modbus-ts/codec'

const regs = encodeFloat32(12.5)
const value = decodeFloat32(regs)
console.log(value)
```

## 组合示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'
import { decodeFloat32, encodeFloat32 } from '@modbus-ts/codec'

const client = new ModbusClient({ transport: new TcpTransport({ host: '127.0.0.1', port: 502 }) })
await client.connect()
await client.writeMultipleRegisters(120, encodeFloat32(22.5))
console.log(decodeFloat32(await client.readHoldingRegisters(120, 2)))
```

## 开发命令

- pnpm --filter @modbus-ts/codec build
- pnpm --filter @modbus-ts/codec test
- pnpm --filter @modbus-ts/codec typecheck
