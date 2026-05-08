# @modbus-ts/transport-electron-ipc

Electron IPC transport implementation for the modbus-ts Transport interface.

## Installation

```bash
pnpm add @modbus-ts/transport-electron-ipc
```

## Core Exports

- ElectronIpcTransportOptions
- ElectronIpcTransport
- Re-exported bridge helpers from @modbus-ts/electron-ipc-bridge

## Minimal Example

```ts
import { ElectronIpcTransport } from '@modbus-ts/transport-electron-ipc'

const transport = new ElectronIpcTransport({
  ipc: window.modbusIpc,
})

await transport.connect()
```

## Behavior

- Uses invoke channels for connect, send, close
- Listens for data and closed events from main process
- Emits Transport-compatible onData and onClose callbacks

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
- [@modbus-ts/transport-tcp](https://www.npmjs.com/package/@modbus-ts/transport-tcp)
- [@modbus-ts/transport-udp](https://www.npmjs.com/package/@modbus-ts/transport-udp)
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
