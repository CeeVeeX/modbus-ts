import 'dotenv/config'
import { ModbusGateway } from '@modbus-ts/gateway'

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const wsPort = readNumber('GATEWAY_WS_PORT', 18080)
const plcHost = process.env.PLC_HOST ?? '127.0.0.1'
const plcPort = readNumber('PLC_PORT', 502)

const gateway = new ModbusGateway({
  wsPort,
  plcHost,
  plcPort,
})

await gateway.start()
console.log(`[gateway] started ws=127.0.0.1:${wsPort} -> plc=${plcHost}:${plcPort}`)

const shutdown = async (): Promise<void> => {
  await gateway.stop()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown()
})
process.on('SIGTERM', () => {
  void shutdown()
})
