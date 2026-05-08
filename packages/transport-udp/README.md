# @modbus-ts/transport-udp

Node.js UDP transport adapter for Modbus traffic.

## Core Exports

- UdpTransportOptions
- UdpTransport

## Minimal Example

```ts
import { UdpTransport } from '@modbus-ts/transport-udp'

const transport = new UdpTransport({
  host: '127.0.0.1',
  port: 502,
  bindAddress: '0.0.0.0',
  bindPort: 0,
})

await transport.connect()
await transport.send(new Uint8Array([1, 3, 0, 0, 0, 2, 196, 11]))
await transport.close()
```

## Behavior

- Datagram-based transport
- Works well with RTU/ASCII payload frames
- Emits received packets through onData

## Dev

```bash
pnpm --filter @modbus-ts/transport-udp test
```
