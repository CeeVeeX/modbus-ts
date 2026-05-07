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

  client.on('connect', () => {
    console.log(`[udp-example] connected ${host}:${port} mode=${mode}`)
  })
  client.on('disconnect', () => {
    console.log('[udp-example] disconnected')
  })
  client.on('timeout', () => {
    console.log('[udp-example] timeout')
  })
  client.on('error', (err) => {
    console.error('[udp-example] error', err)
  })

  await client.connect()

  const regs = await client.readHoldingRegisters(0, 4)
  console.log('[udp-example] read result:', regs)

  await client.writeSingleRegister(10, 123)
  console.log('[udp-example] write single done')

  const unsubscribe = client.subscribe({
    start: 0,
    length: 2,
    interval: 500,
    callback: (values) => {
      console.log('[udp-example] polling update:', values)
    },
  })

  setTimeout(async () => {
    unsubscribe()
    await client.close()
  }, 5000)
}

void main()
