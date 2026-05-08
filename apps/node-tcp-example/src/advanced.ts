import 'dotenv/config'
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'

async function main(): Promise<void> {
  const host = process.env.MODBUS_HOST ?? '127.0.0.1'
  const port = Number.parseInt(process.env.MODBUS_PORT ?? '502', 10)

  const transport = new TcpTransport({ host, port: Number.isNaN(port) ? 502 : port })
  const client = new ModbusClient({
    transport,
    defaultUnitId: 1,
    defaultTimeout: 1000,
  })

  client.on('connect', () => console.log('[advanced] connected'))
  client.on('disconnect', () => console.log('[advanced] disconnected'))
  client.on('timeout', () => console.log('[advanced] timeout'))
  client.on('error', (err) => console.error('[advanced] error', err))

  await client.connect()

  // interval=500 的重叠订阅，底层会合并读取区间。
  const unsubscribeA = client.subscribe({
    start: 0,
    length: 3,
    interval: 500,
    callback: (regs) => console.log('[sub A 0-2]', regs),
  })

  const unsubscribeB = client.subscribe({
    start: 3,
    length: 2,
    interval: 500,
    callback: (regs) => console.log('[sub B 3-4]', regs),
  })

  // 重复订阅相同区间，底层会去重（只发一次请求，结果分发给两个 callback）。
  const unsubscribeC = client.subscribe({
    start: 0,
    length: 5,
    interval: 500,
    callback: (regs) => console.log('[sub C 0-4]', regs),
  })

  const unsubscribeD = client.subscribe({
    start: 0,
    length: 5,
    interval: 500,
    callback: (regs) => console.log('[sub D 0-4 dup]', regs),
  })

  // 主动读请求，优先级设为 read(50)。
  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const regs = await client.readHoldingRegisters(0, 5, { priority: 50 })
    console.log('[manual read priority=read]', regs)

    const inputRegs = await client.readInputRegisters(0, 5, { priority: 50 })
    console.log('[manual read input regs priority=read]', inputRegs)

    const coils = await client.readCoils(0, 8, { priority: 50 })
    console.log('[manual read coils priority=read]', coils)

    const discreteInputs = await client.readDiscreteInputs(0, 8, { priority: 50 })
    console.log('[manual read discrete inputs priority=read]', discreteInputs)
  })()

  // 写请求优先级更高(write=100)，用于观察调度抢占效果。
  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 1800))
    await client.writeSingleRegister(10, 123, { priority: 100 })
    console.log('[manual write priority=write] done')

    await client.writeSingleCoil(11, true, { priority: 100 })
    console.log('[manual write single coil priority=write] done')

    await client.writeMultipleCoils(12, [true, false, true], { priority: 100 })
    console.log('[manual write multi coils priority=write] done')
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
