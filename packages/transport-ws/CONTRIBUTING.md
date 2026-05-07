# Contributing: @modbus-ts/transport-ws

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/transport-ws build
- pnpm --filter @modbus-ts/transport-ws test
- pnpm --filter @modbus-ts/transport-ws typecheck

## 包特定注意事项

- 保持浏览器运行时兼容，不依赖 Node API。
- 帧缓存与 reconnect 逻辑需稳定。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
