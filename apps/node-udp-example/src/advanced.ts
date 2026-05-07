import { ModbusClient } from '@modbus-ts/client'
import { UdpTransport } from '@modbus-ts/transport-udp'

type WireMode = 'rtu' | 'ascii'

function parseMode(value: string | undefined): WireMode {
  if (value === 'ascii') {
    return 'ascii'
  }
  return 'rtu'
}

function toInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return parsed
}

async function main(): Promise<void> {
  const host = process.env.MODBUS_HOST ?? '127.0.0.1'
  const port = toInt(process.env.MODBUS_PORT, 502)
  const unitId = toInt(process.env.MODBUS_UNIT, 1)
  const mode = parseMode(process.env.MODBUS_MODE)

  const transport = new UdpTransport({ host, port })
  const client = new ModbusClient({
    transport,
    mode,
    defaultUnitId: unitId,
    defaultTimeout: 1000,
  })

  client.on('connect', () => console.log(`[udp-advanced] connected ${host}:${port} mode=${mode}`))
  client.on('disconnect', () => console.log('[udp-advanced] disconnected'))
  client.on('timeout', () => console.log('[udp-advanced] timeout'))
  client.on('error', (err) => console.error('[udp-advanced] error', err))

  await client.connect()

  const unsubscribeA = client.subscribe({
    start: 0,
    length: 3,
    interval: 500,
    callback: (regs) => console.log('[udp sub A 0-2]', regs),
  })

  const unsubscribeB = client.subscribe({
    start: 3,
    length: 2,
    interval: 500,
    callback: (regs) => console.log('[udp sub B 3-4]', regs),
  })

  const unsubscribeC = client.subscribe({
    start: 0,
    length: 5,
    interval: 500,
    callback: (regs) => console.log('[udp sub C 0-4]', regs),
  })

  const unsubscribeD = client.subscribe({
    start: 0,
    length: 5,
    interval: 500,
    callback: (regs) => console.log('[udp sub D 0-4 dup]', regs),
  })

  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const regs = await client.readHoldingRegisters(0, 5, { priority: 50 })
    console.log('[udp manual read priority=50]', regs)
  })()

  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 1800))
    await client.writeSingleRegister(10, 123, { priority: 100 })
    console.log('[udp manual write priority=100] done')
  })()

  setTimeout(async () => {
    unsubscribeA()
    unsubscribeB()
    unsubscribeC()
    unsubscribeD()
    await client.close()
  }, 7000)
}

void main()
