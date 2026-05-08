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
