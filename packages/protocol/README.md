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

- FC1 Read Coils
- FC2 Read Discrete Inputs
- FC3 Read Holding Registers
- FC4 Read Input Registers
- FC5 Write Single Coil
- FC6 Write Single Register
- FC15 Write Multiple Coils
- FC16 Write Multiple Registers

## Point Mapping

| Function Code | Data Type          | Read/Write | Typical API in client  |
| ------------- | ------------------ | ---------- | ---------------------- |
| FC1           | Coils              | Read       | readCoils              |
| FC2           | Discrete Inputs    | Read       | readDiscreteInputs     |
| FC3           | Holding Registers  | Read       | readHoldingRegisters   |
| FC4           | Input Registers    | Read       | readInputRegisters     |
| FC5           | Single Coil        | Write      | writeSingleCoil        |
| FC6           | Single Register    | Write      | writeSingleRegister    |
| FC15          | Multiple Coils     | Write      | writeMultipleCoils     |
| FC16          | Multiple Registers | Write      | writeMultipleRegisters |

## Dev

```bash
pnpm --filter @modbus-ts/protocol test
```
