# Contributing: @modbus-ts/core

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/core build
- pnpm --filter @modbus-ts/core test
- pnpm --filter @modbus-ts/core typecheck

## 包特定注意事项

- 该包只放跨包共享契约，不放具体协议或网络实现。
- 新增错误类型时保持命名与语义稳定，避免破坏上层捕获逻辑。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
