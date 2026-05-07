# Contributing: @modbus-ts/transport-electron-ipc

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/transport-electron-ipc build
- pnpm --filter @modbus-ts/transport-electron-ipc test
- pnpm --filter @modbus-ts/transport-electron-ipc typecheck

## 包特定注意事项

- 默认通道名变更需同步 Electron 集成侧。
- 监听解绑必须兼容 off/removeListener。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
