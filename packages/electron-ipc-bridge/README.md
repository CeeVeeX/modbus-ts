# @modbus-ts/electron-ipc-bridge

Typed Electron bridge helpers for main and renderer Modbus channels.

## Core Exports

- ElectronIpcBridge
- ElectronMainBridgeOptions
- ElectronMainBridge
- createElectronRendererBridge
- createElectronMainBridge

## Minimal Example

```ts
import { createElectronRendererBridge } from '@modbus-ts/electron-ipc-bridge'

const bridge = createElectronRendererBridge(window.modbusIpc)
await bridge.invoke('modbus:connect')
```

## Behavior

- Standardizes connect, send, close channels
- Converts payloads to Uint8Array safely
- Supports custom channel names

## Dev

```bash
pnpm --filter @modbus-ts/electron-ipc-bridge test
```

## Quick Links to Other Packages

<!-- package-links:start -->

- [@modbus-ts/client](https://www.npmjs.com/package/@modbus-ts/client)
- [@modbus-ts/codec](https://www.npmjs.com/package/@modbus-ts/codec)
- [@modbus-ts/core](https://www.npmjs.com/package/@modbus-ts/core)
- [@modbus-ts/gateway](https://www.npmjs.com/package/@modbus-ts/gateway)
- [@modbus-ts/protocol](https://www.npmjs.com/package/@modbus-ts/protocol)
- [@modbus-ts/scheduler](https://www.npmjs.com/package/@modbus-ts/scheduler)
- [@modbus-ts/subscription](https://www.npmjs.com/package/@modbus-ts/subscription)
- [@modbus-ts/transport-electron-ipc](https://www.npmjs.com/package/@modbus-ts/transport-electron-ipc)
- [@modbus-ts/transport-tcp](https://www.npmjs.com/package/@modbus-ts/transport-tcp)
- [@modbus-ts/transport-udp](https://www.npmjs.com/package/@modbus-ts/transport-udp)
- [@modbus-ts/transport-ws](https://www.npmjs.com/package/@modbus-ts/transport-ws)
- [@modbus-ts/utils](https://www.npmjs.com/package/@modbus-ts/utils)
<!-- package-links:end -->
