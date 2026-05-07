# Contributing: @modbus-ts/protocol

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/protocol build
- pnpm --filter @modbus-ts/protocol test
- pnpm --filter @modbus-ts/protocol typecheck

## 包特定注意事项

- 保持协议层纯函数，不引入 socket/timeout/retry。
- 新增功能码时同步异常分支与边界测试。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
