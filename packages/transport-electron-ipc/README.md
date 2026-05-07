# @modbus-ts/transport-electron-ipc

Electron renderer 与 main 进程间的 IPC Transport。

## 核心导出

- ElectronIpcBridge
- ElectronIpcTransportOptions
- ElectronIpcTransport

## 最小示例

```ts
import { ElectronIpcTransport } from '@modbus-ts/transport-electron-ipc'

const transport = new ElectronIpcTransport({ ipc: window.modbusIpc })
await transport.connect()
await transport.send(Uint8Array.from([0, 1, 0, 0]))
```

## 组合示例

```ts
import { ModbusClient } from '@modbus-ts/client'
import { ElectronIpcTransport } from '@modbus-ts/transport-electron-ipc'

const client = new ModbusClient({
  transport: new ElectronIpcTransport({ ipc: window.modbusIpc }),
  defaultUnitId: 1,
})

await client.connect()
console.log(await client.readHoldingRegisters(0, 4))
```

## 桥封装示例

```ts
import {
  createElectronMainBridge,
  createElectronRendererBridge,
} from '@modbus-ts/electron-ipc-bridge'
import { ElectronIpcTransport } from '@modbus-ts/transport-electron-ipc'

// preload / renderer bridge
const rendererBridge = createElectronRendererBridge(window.modbusIpc)
const transport = new ElectronIpcTransport({ ipc: rendererBridge })

// main bridge
const mainBridge = createElectronMainBridge({
  ipcMain,
  emitToRenderer: (channel, payload) => win.webContents.send(channel, payload),
  onConnect: async () => {
    // connect tcp
  },
  onSend: async (frame) => {
    // write tcp frame
  },
  onClose: async () => {
    // close tcp
  },
})

// push data from tcp socket to renderer
mainBridge.emitData(Uint8Array.from([0, 1]))
mainBridge.emitClosed({ message: 'closed' })
```

## 开发命令

- pnpm --filter @modbus-ts/transport-electron-ipc build
- pnpm --filter @modbus-ts/transport-electron-ipc test
- pnpm --filter @modbus-ts/transport-electron-ipc typecheck
