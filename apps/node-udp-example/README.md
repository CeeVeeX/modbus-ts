# @modbus-ts/node-udp-example

A minimal Node.js example that uses `@modbus-ts/transport-udp` with `ModbusClient`.

## Run

```bash
pnpm --filter @modbus-ts/node-udp-example dev
```

## Environment Variables

- `MODBUS_HOST` (default: `127.0.0.1`)
- `MODBUS_PORT` (default: `502`)
- `MODBUS_UNIT` (default: `1`)
- `MODBUS_MODE` (`rtu` or `ascii`, default: `rtu`)

Example:

```bash
MODBUS_HOST=192.168.1.10 MODBUS_PORT=502 MODBUS_MODE=ascii pnpm --filter @modbus-ts/node-udp-example dev
```
