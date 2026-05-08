# modbus-ts

TypeScript Modbus runtime for Node.js, browsers, and Electron.

modbus-ts is an ESM-first monorepo with composable packages for protocol encoding/decoding, transport adapters, scheduling, subscription polling, and a high-level client API.

## Highlights

- Multi-wire protocol support: TCP, RTU, ASCII
- Transports: TCP, UDP, WebSocket, Electron IPC
- High-level client API for read, write, and subscribe
- Priority scheduler with timeout handling
- Subscription engine with range merge and change detection
- Browser WebSocket gateway with TCP connection pooling
- Industrial data codec with byte-swap and word-swap options

## Packages

- @modbus-ts/client: high-level Modbus client
- @modbus-ts/core: shared contracts, types, and errors
- @modbus-ts/protocol: FC1/FC2/FC3/FC4/FC5/FC6/FC15/FC16 frame encode/decode for TCP/RTU/ASCII
- @modbus-ts/scheduler: serial request queue with priority
- @modbus-ts/subscription: polling engine and range merge
- @modbus-ts/transport-tcp: Node TCP transport with reconnect
- @modbus-ts/transport-udp: Node UDP transport
- @modbus-ts/transport-ws: browser WebSocket transport with reconnect
- @modbus-ts/electron-ipc-bridge: typed Electron main/renderer bridge
- @modbus-ts/transport-electron-ipc: Electron IPC transport adapter
- @modbus-ts/gateway: WebSocket to TCP binary relay gateway
- @modbus-ts/codec: register-value codec helpers
- @modbus-ts/utils: shared async and comparison utilities

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
```

Run examples:

```bash
pnpm --filter @modbus-ts/node-tcp-example dev
pnpm --filter @modbus-ts/node-udp-example dev
pnpm --filter @modbus-ts/browser-example dev
```

## Minimal Client Example

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'

const transport = new TcpTransport({ host: '127.0.0.1', port: 502 })
const client = new ModbusClient({ transport, defaultUnitId: 1, mode: 'tcp' })

await client.connect()
const regs = await client.readHoldingRegisters(0, 4)
const inputRegs = await client.readInputRegisters(0, 4)
const coils = await client.readCoils(0, 8)
const discreteInputs = await client.readDiscreteInputs(0, 8)

await client.writeSingleRegister(10, 123)
await client.writeSingleCoil(11, true)
await client.writeMultipleCoils(12, [true, false, true])

console.log({ regs, inputRegs, coils, discreteInputs })
await client.close()
```

## Development Commands

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
```

## License

MIT
