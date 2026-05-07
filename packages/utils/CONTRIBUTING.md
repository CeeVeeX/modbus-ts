# Contributing: @modbus-ts/utils

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/utils build
- pnpm --filter @modbus-ts/utils test
- pnpm --filter @modbus-ts/utils typecheck

## 包特定注意事项

- 保持函数小而纯。
- 避免业务语义下沉到 utils。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
