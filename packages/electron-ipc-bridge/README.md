# @modbus-ts/electron-ipc-bridge

Electron renderer/main 间 IPC 桥接封装，提供标准化桥创建与主进程 handler 注册。

## 核心导出

- ElectronIpcBridge
- createElectronRendererBridge
- createElectronMainBridge
- ElectronMainBridge

## 最小示例

```ts
import { createElectronRendererBridge } from '@modbus-ts/electron-ipc-bridge'

const bridge = createElectronRendererBridge(window.modbusIpc)
await bridge.invoke('modbus:connect')
```

## 组合示例

```ts
import { createElectronMainBridge } from '@modbus-ts/electron-ipc-bridge'

const bridge = createElectronMainBridge({
  ipcMain,
  webContents: win.webContents,
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

bridge.emitData(Uint8Array.from([0, 1]))
```

## 开发命令

- pnpm --filter @modbus-ts/electron-ipc-bridge build
- pnpm --filter @modbus-ts/electron-ipc-bridge test
- pnpm --filter @modbus-ts/electron-ipc-bridge typecheck
