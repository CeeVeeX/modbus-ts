import { ModbusClient } from '@modbus-ts/client'
import { decodeAsciiString, encodeAsciiString } from '@modbus-ts/codec'
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

  console.log(`Connecting to ${host}:${port} (mode=${mode}, unit=${unitId})...`)

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

  try {
    await client.connect()

    const regs = await client.readHoldingRegisters(0, 4)
    console.log('[udp-example] read result:', regs)

    const inputRegs = await client.readInputRegisters(0, 4)
    console.log('[udp-example] read input registers:', inputRegs)

    const coils = await client.readCoils(0, 8)
    console.log('[udp-example] read coils:', coils)

    const discreteInputs = await client.readDiscreteInputs(0, 8)
    console.log('[udp-example] read discrete inputs:', discreteInputs)

    await client.writeSingleRegister(10, 123)
    console.log('[udp-example] write single done')

    await client.writeSingleCoil(11, true)
    console.log('[udp-example] write single coil done')

    await client.writeMultipleCoils(12, [true, false, true])
    console.log('[udp-example] write multiple coils done')

    const asciiStart = 100
    const asciiText = 'HELLO'
    const asciiRegs = encodeAsciiString(asciiText, { padByte: 0x20 })
    await client.writeMultipleRegisters(asciiStart, asciiRegs)
    const asciiReadRegs = await client.readHoldingRegisters(asciiStart, asciiRegs.length)
    console.log('[udp-example] ascii write/read regs:', asciiReadRegs)
    console.log('[udp-example] ascii decoded text:', decodeAsciiString(asciiReadRegs))

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
      console.log('[udp-example] Demo completed successfully!')
    }, 5000)
  } catch (error) {
    console.error('\n❌ Demo failed:')
    console.error(error instanceof Error ? error.message : error)
    console.error('\n💡 Tip: Make sure a Modbus UDP server is running at', `${host}:${port}`)
    console.error('   You can set environment variables:\n')
    console.error('   MODBUS_HOST=192.168.1.100')
    console.error('   MODBUS_PORT=502')
    console.error('   MODBUS_MODE=rtu')
    console.error('   MODBUS_UNIT=1\n')
    await client.close()
    process.exit(1)
  }
}

void main()
