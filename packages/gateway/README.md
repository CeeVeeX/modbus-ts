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
