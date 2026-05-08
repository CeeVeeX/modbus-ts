# @modbus-ts/transport-tcp

Node.js TCP transport adapter for Modbus traffic.

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

## Dev

```bash
pnpm --filter @modbus-ts/transport-tcp test
```
