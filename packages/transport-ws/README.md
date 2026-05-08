# @modbus-ts/transport-ws

Browser WebSocket transport adapter for Modbus traffic.

## Installation

```bash
pnpm add @modbus-ts/transport-ws
```

## Core Exports

- WsTransportOptions
- WsTransport

## Minimal Example

```ts
import { WsTransport } from '@modbus-ts/transport-ws'

const transport = new WsTransport({
  url: 'ws://127.0.0.1:18080',
  reconnectDelayMs: 300,
  maxReconnectDelayMs: 5000,
})

await transport.connect()
await transport.send(new Uint8Array([0, 1, 0, 0, 0, 6, 1, 3, 0, 0, 0, 1]))
```

## Behavior

- Buffers and reassembles MBAP-based frames
- Automatic reconnect with exponential backoff
- Designed for browser to gateway communication

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
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
