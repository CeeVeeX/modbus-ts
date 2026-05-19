import 'dotenv/config'
import { ModbusClient } from '@modbus-ts/client'
import { decodeAsciiString, encodeAsciiString } from '@modbus-ts/codec'
import { TcpTransport } from '@modbus-ts/transport-tcp'

async function main(): Promise<void> {
  const host = process.env.MODBUS_HOST ?? '127.0.0.1'
  const port = Number.parseInt(process.env.MODBUS_PORT ?? '502', 10)

  const transport = new TcpTransport({
    host,
    port: Number.isNaN(port) ? 502 : port,
  })

  const client = new ModbusClient({
    transport,
    defaultUnitId: 1,
    defaultTimeout: 1000,
  })

  client.on('connect', () => console.log('connected'))
  client.on('disconnect', () => console.log('disconnected'))
  client.on('error', (err) => console.error('error', err))

  await client.connect()

  const regs = await client.readHoldingRegisters(0, 4)
  console.log('read result:', regs)

  const inputRegs = await client.readInputRegisters(0, 4)
  console.log('read input registers:', inputRegs)

  const coils = await client.readCoils(0, 8)
  console.log('read coils:', coils)

  const discreteInputs = await client.readDiscreteInputs(0, 8)
  console.log('read discrete inputs:', discreteInputs)

  await client.writeSingleRegister(0, Math.floor(Math.random() * 100))
  console.log('write single done')

  await client.writeSingleCoil(1, true)
  console.log('write single coil done')

  await client.writeMultipleCoils(2, [true, false, true, true])
  console.log('write multiple coils done')

  const asciiStart = 100
  const asciiText = 'HELLO'
  const asciiRegs = encodeAsciiString(asciiText, { padByte: 0x20 })
  await client.writeMultipleRegisters(asciiStart, asciiRegs)
  const asciiReadRegs = await client.readHoldingRegisters(asciiStart, asciiRegs.length)
  console.log('ascii write/read regs:', asciiReadRegs)
  console.log('ascii decoded text:', decodeAsciiString(asciiReadRegs))

  const unsubscribe = client.subscribe({
    start: 0,
    length: 2,
    interval: 500,
    callback: (values) => console.log('subscription update:', values),
  })

  setTimeout(async () => {
    unsubscribe()
    await client.close()
  }, 5000)
}

void main()
