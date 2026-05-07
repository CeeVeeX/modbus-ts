import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@modbus-ts/core': resolve(__dirname, 'packages/core/src/index.ts'),
      '@modbus-ts/protocol': resolve(__dirname, 'packages/protocol/src/index.ts'),
      '@modbus-ts/scheduler': resolve(__dirname, 'packages/scheduler/src/index.ts'),
      '@modbus-ts/subscription': resolve(__dirname, 'packages/subscription/src/index.ts'),
      '@modbus-ts/transport-electron-ipc': resolve(
        __dirname,
        'packages/transport-electron-ipc/src/index.ts',
      ),
      '@modbus-ts/transport-tcp': resolve(__dirname, 'packages/transport-tcp/src/index.ts'),
      '@modbus-ts/transport-udp': resolve(__dirname, 'packages/transport-udp/src/index.ts'),
      '@modbus-ts/transport-ws': resolve(__dirname, 'packages/transport-ws/src/index.ts'),
      '@modbus-ts/client': resolve(__dirname, 'packages/client/src/index.ts'),
      '@modbus-ts/gateway': resolve(__dirname, 'packages/gateway/src/index.ts'),
      '@modbus-ts/codec': resolve(__dirname, 'packages/codec/src/index.ts'),
      '@modbus-ts/utils': resolve(__dirname, 'packages/utils/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts', 'packages/**/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/**/src/**/*.ts'],
      exclude: ['packages/**/test/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
