# Contributing: @modbus-ts/gateway

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/gateway build
- pnpm --filter @modbus-ts/gateway test
- pnpm --filter @modbus-ts/gateway typecheck

## 包特定注意事项

- 网关只做透传，不做协议语义处理。
- 连接池行为改动需验证浏览器链路。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
