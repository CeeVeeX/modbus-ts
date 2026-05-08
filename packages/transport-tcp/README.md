# @modbus-ts/transport-tcp

Node.js TCP transport adapter for Modbus traffic.

## Installation

```bash
pnpm add @modbus-ts/transport-tcp
```

## Core Exports

- TcpTransportOptions
- TcpTransport

## Minimal Example

```ts
import { TcpTransport } from '@modbus-ts/transport-tcp'

const transport = new TcpTransport({
  host: '127.0.0.1',
  port: 502,
  connectTimeoutMs: 5000,
  reconnectDelayMs: 300,
  maxReconnectDelayMs: 5000,
})

await transport.connect()
await transport.send(new Uint8Array([0, 1, 0, 0, 0, 6, 1, 3, 0, 0, 0, 1]))
await transport.close()
```

## Behavior

- MBAP-based frame assembly from TCP stream
- Automatic reconnect with exponential backoff
- onConnect, onData, onClose callbacks

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
- [@modbus-ts/transport-udp](https://www.npmjs.com/package/@modbus-ts/transport-udp)
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
