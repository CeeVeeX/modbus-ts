# @modbus-ts/gateway

WebSocket to TCP Modbus relay gateway for browser clients.

## Core Exports

- GatewayOptions
- ModbusGateway

## Minimal Example

```ts
import { ModbusGateway } from '@modbus-ts/gateway'

const gateway = new ModbusGateway({
  wsPort: 18080,
  plcHost: '127.0.0.1',
  plcPort: 502,
})

await gateway.start()
```

## Behavior

- Accepts browser WebSocket connections
- Relays binary frames to PLC over TCP
- Uses internal TCP connection pool for reuse

## Dev

```bash
pnpm --filter @modbus-ts/gateway test
```

## Quick Links to Other Packages

<!-- package-links:start -->

- [@modbus-ts/client](https://www.npmjs.com/package/@modbus-ts/client)
- [@modbus-ts/codec](https://www.npmjs.com/package/@modbus-ts/codec)
- [@modbus-ts/core](https://www.npmjs.com/package/@modbus-ts/core)
- [@modbus-ts/electron-ipc-bridge](https://www.npmjs.com/package/@modbus-ts/electron-ipc-bridge)
- [@modbus-ts/protocol](https://www.npmjs.com/package/@modbus-ts/protocol)
- [@modbus-ts/scheduler](https://www.npmjs.com/package/@modbus-ts/scheduler)
- [@modbus-ts/subscription](https://www.npmjs.com/package/@modbus-ts/subscription)
- [@modbus-ts/transport-electron-ipc](https://www.npmjs.com/package/@modbus-ts/transport-electron-ipc)
- [@modbus-ts/transport-tcp](https://www.npmjs.com/package/@modbus-ts/transport-tcp)
- [@modbus-ts/transport-udp](https://www.npmjs.com/package/@modbus-ts/transport-udp)
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
