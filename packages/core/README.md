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

## Quick Links to Other Packages

<!-- package-links:start -->

- [@modbus-ts/client](https://www.npmjs.com/package/@modbus-ts/client)
- [@modbus-ts/codec](https://www.npmjs.com/package/@modbus-ts/codec)
- [@modbus-ts/electron-ipc-bridge](https://www.npmjs.com/package/@modbus-ts/electron-ipc-bridge)
- [@modbus-ts/gateway](https://www.npmjs.com/package/@modbus-ts/gateway)
- [@modbus-ts/protocol](https://www.npmjs.com/package/@modbus-ts/protocol)
- [@modbus-ts/scheduler](https://www.npmjs.com/package/@modbus-ts/scheduler)
- [@modbus-ts/subscription](https://www.npmjs.com/package/@modbus-ts/subscription)
- [@modbus-ts/transport-electron-ipc](https://www.npmjs.com/package/@modbus-ts/transport-electron-ipc)
- [@modbus-ts/transport-tcp](https://www.npmjs.com/package/@modbus-ts/transport-tcp)
- [@modbus-ts/transport-udp](https://www.npmjs.com/package/@modbus-ts/transport-udp)
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
