import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'

async function main(): Promise<void> {
  const transport = new TcpTransport({
    host: '127.0.0.1',
    port: 502,
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

  await client.writeSingleRegister(10, 123)
  console.log('write single done')

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
