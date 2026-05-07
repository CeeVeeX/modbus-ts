import { ModbusClient } from '@modbus-ts/client'
import { WsTransport } from '@modbus-ts/transport-ws'

const logNode = document.querySelector<HTMLPreElement>('#log')
const connectBtn = document.querySelector<HTMLButtonElement>('#connect')
const readBtn = document.querySelector<HTMLButtonElement>('#read')
const writeBtn = document.querySelector<HTMLButtonElement>('#write')
const startAdvancedBtn = document.querySelector<HTMLButtonElement>('#start-advanced')
const stopAdvancedBtn = document.querySelector<HTMLButtonElement>('#stop-advanced')

if (!logNode || !connectBtn || !readBtn || !writeBtn || !startAdvancedBtn || !stopAdvancedBtn) {
  throw new Error('missing dom nodes')
}

const log = (line: string) => {
  logNode.textContent += `${line}\n`
}

const wsUrl = import.meta.env.VITE_MODBUS_WS_URL ?? 'ws://127.0.0.1:18080'
const transport = new WsTransport({ url: wsUrl })
const client = new ModbusClient({ transport, defaultUnitId: 1 })
const advancedUnsubscribers: Array<() => void> = []

client.on('connect', () => log('connected'))
client.on('disconnect', () => log('disconnected'))
client.on('timeout', () => log('timeout'))
client.on('error', (err) => log(`error: ${err?.message ?? 'unknown'}`))

connectBtn.onclick = async () => {
  log(`connecting to gateway: ${wsUrl}`)
  await client.connect()
}

readBtn.onclick = async () => {
  const values = await client.readHoldingRegisters(0, 4, { priority: 50 })
  log(`read: ${JSON.stringify(values)}`)
}

writeBtn.onclick = async () => {
  await client.writeSingleRegister(10, 123, { priority: 100 })
  log('write: done (priority=100)')
}

startAdvancedBtn.onclick = () => {
  if (advancedUnsubscribers.length > 0) {
    return
  }

  advancedUnsubscribers.push(
    client.subscribe({
      start: 0,
      length: 3,
      interval: 500,
      callback: (values) => log(`[sub A 0-2] ${JSON.stringify(values)}`),
    }),
  )

  advancedUnsubscribers.push(
    client.subscribe({
      start: 3,
      length: 2,
      interval: 500,
      callback: (values) => log(`[sub B 3-4] ${JSON.stringify(values)}`),
    }),
  )

  advancedUnsubscribers.push(
    client.subscribe({
      start: 0,
      length: 5,
      interval: 500,
      callback: (values) => log(`[sub C 0-4] ${JSON.stringify(values)}`),
    }),
  )

  advancedUnsubscribers.push(
    client.subscribe({
      start: 0,
      length: 5,
      interval: 500,
      callback: (values) => log(`[sub D 0-4 dup] ${JSON.stringify(values)}`),
    }),
  )

  startAdvancedBtn.disabled = true
  stopAdvancedBtn.disabled = false
  log('advanced subscriptions started (merge + dedupe + polling)')
}

stopAdvancedBtn.onclick = () => {
  while (advancedUnsubscribers.length > 0) {
    const unsubscribe = advancedUnsubscribers.pop()
    unsubscribe?.()
  }
  startAdvancedBtn.disabled = false
  stopAdvancedBtn.disabled = true
  log('advanced subscriptions stopped')
}
