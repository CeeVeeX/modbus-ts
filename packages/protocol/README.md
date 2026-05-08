# @modbus-ts/protocol

Modbus frame encoder/decoder for TCP, RTU, and ASCII.

## Core Exports

- ModbusWireMode
- encodeReadHoldingRegisters / encodeReadHoldingRegistersByMode
- encodeWriteSingleRegister / encodeWriteSingleRegisterByMode
- encodeWriteMultipleRegisters / encodeWriteMultipleRegistersByMode
- decodeResponse / decodeResponseByMode

## Minimal Example

```ts
import { decodeResponseByMode, encodeReadHoldingRegistersByMode } from '@modbus-ts/protocol'

const request = encodeReadHoldingRegistersByMode({
  mode: 'rtu',
  transactionId: 1,
  unitId: 1,
  startAddress: 0,
  quantity: 2,
})

const response = decodeResponseByMode(new Uint8Array([1, 3, 4, 0, 1, 0, 2, 42, 57]), 'rtu')
```

## Supported Function Codes

- FC3 Read Holding Registers
- FC4 Read Input Registers
- FC6 Write Single Register
- FC16 Write Multiple Registers

## Dev

```bash
pnpm --filter @modbus-ts/protocol test
```
