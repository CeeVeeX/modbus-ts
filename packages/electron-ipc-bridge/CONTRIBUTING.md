# Contributing: @modbus-ts/electron-ipc-bridge

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/electron-ipc-bridge build
- pnpm --filter @modbus-ts/electron-ipc-bridge test
- pnpm --filter @modbus-ts/electron-ipc-bridge typecheck

## 包特定注意事项

- 桥层只处理 IPC 通道映射与生命周期，不承载 Modbus 协议语义。
- 默认通道名变更需同步 transport-electron-ipc 与集成文档。

## 提交前检查

- 变更范围仅限桥层职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
