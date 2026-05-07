# Contributing: @modbus-ts/transport-udp

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/transport-udp build
- pnpm --filter @modbus-ts/transport-udp test
- pnpm --filter @modbus-ts/transport-udp typecheck

## 包特定注意事项

- send/connect/close 语义与其他 transport 保持一致。
- 错误路径统一复用 core 标准错误。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
