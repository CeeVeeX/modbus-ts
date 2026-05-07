# Contributing: @modbus-ts/transport-tcp

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/transport-tcp build
- pnpm --filter @modbus-ts/transport-tcp test
- pnpm --filter @modbus-ts/transport-tcp typecheck

## 包特定注意事项

- 保持 MBAP 拆包/粘包处理正确。
- 重连退避策略变更需验证断线恢复。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
