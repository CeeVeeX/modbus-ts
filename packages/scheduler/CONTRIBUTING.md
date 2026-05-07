# Contributing: @modbus-ts/scheduler

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/scheduler build
- pnpm --filter @modbus-ts/scheduler test
- pnpm --filter @modbus-ts/scheduler typecheck

## 包特定注意事项

- 保证同一连接一次仅一个 in-flight 请求。
- 超时语义保持 Promise.race 兼容。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
