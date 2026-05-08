# @modbus-ts/transport-ws

Browser WebSocket transport adapter for Modbus traffic.

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

## Dev

```bash
pnpm --filter @modbus-ts/transport-ws test
```
