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
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
