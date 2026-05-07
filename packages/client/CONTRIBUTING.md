# Contributing: @modbus-ts/client

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/client build
- pnpm --filter @modbus-ts/client test
- pnpm --filter @modbus-ts/client typecheck

## 包特定注意事项

- 保持 connect/disconnect/timeout/error 事件语义稳定。
- 新增 API 时同步示例与测试。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
