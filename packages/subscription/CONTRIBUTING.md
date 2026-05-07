# Contributing: @modbus-ts/subscription

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/subscription build
- pnpm --filter @modbus-ts/subscription test
- pnpm --filter @modbus-ts/subscription typecheck

## 包特定注意事项

- 轮询循环保持无重叠执行。
- 改动合并逻辑需验证 O(n log n) 路径与正确性。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
