# Contributing: @modbus-ts/codec

## 本地开发

- pnpm install
- pnpm --filter @modbus-ts/codec build
- pnpm --filter @modbus-ts/codec test
- pnpm --filter @modbus-ts/codec typecheck

## 包特定注意事项

- 保持 byteSwap/wordSwap 组合行为可预测。
- 浮点编码改动需覆盖边界值。

## 提交前检查

- 变更范围仅限当前包职责。
- 新增行为必须有测试支撑。
- 包内文档与导出保持一致。
