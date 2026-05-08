# @modbus-ts/core

Core contracts and error types used across modbus-ts packages.

## Core Exports

- ConnectionState
- Transport
- ModbusRequest
- ModbusResponse
- RequestTask
- Subscription
- TimeoutError
- ConnectionClosedError
- ProtocolError
- TransportError

## Minimal Example

```ts
import { ProtocolError, type Transport } from '@modbus-ts/core'

function assertConnected(transport: Transport): void {
  if (!transport) {
    throw new ProtocolError('transport missing')
  }
}
```

## Why This Package Exists

- Defines stable cross-package interfaces
- Standardizes error naming and behavior
- Keeps transport and protocol layers decoupled

## Dev

```bash
pnpm --filter @modbus-ts/core test
```
