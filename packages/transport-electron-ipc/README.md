# @modbus-ts/transport-electron-ipc

Electron IPC transport implementation for the modbus-ts Transport interface.

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

## Dev

```bash
pnpm --filter @modbus-ts/transport-electron-ipc test
```
