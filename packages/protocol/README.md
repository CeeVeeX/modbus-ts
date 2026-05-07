# @modbus-ts/protocol

Modbus TCP/RTU/ASCII 编解码实现，输出统一为 Uint8Array。

## 核心导出

- ModbusWireMode
- encodeReadHoldingRegisters\*
- encodeWriteSingleRegister\*
- encodeWriteMultipleRegisters\*
- decodeResponse\*
- decodeResponseByMode

## 最小示例

```ts
import { encodeReadHoldingRegistersByMode, decodeResponseByMode } from '@modbus-ts/protocol'

const req = encodeReadHoldingRegistersByMode({
  mode: 'tcp',
  transactionId: 1,
  unitId: 1,
  startAddress: 0,
  quantity: 2,
})

const res = decodeResponseByMode(req, 'tcp')
```

## 组合示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { UdpTransport } from '@modbus-ts/transport-udp'

const client = new ModbusClient({
  transport: new UdpTransport({ host: '127.0.0.1', port: 502 }),
  mode: 'rtu',
  defaultUnitId: 1,
})

await client.connect()
const values = await client.readHoldingRegisters(0, 4)
console.log(values)
```

## 开发命令

- pnpm --filter @modbus-ts/protocol build
- pnpm --filter @modbus-ts/protocol test
- pnpm --filter @modbus-ts/protocol typecheck
