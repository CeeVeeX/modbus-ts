import { ModbusClient } from '@modbus-ts/client'
import { WsTransport } from '@modbus-ts/transport-ws'

const logNode = document.querySelector<HTMLPreElement>('#log')
const connectBtn = document.querySelector<HTMLButtonElement>('#connect')
const readBtn = document.querySelector<HTMLButtonElement>('#read')

if (!logNode || !connectBtn || !readBtn) {
  throw new Error('missing dom nodes')
}

const log = (line: string) => {
  logNode.textContent += `${line}\n`
}

const transport = new WsTransport({ url: 'ws://127.0.0.1:18080' })
const client = new ModbusClient({ transport, defaultUnitId: 1 })

client.on('connect', () => log('connected'))
client.on('disconnect', () => log('disconnected'))
client.on('error', (err) => log(`error: ${err?.message ?? 'unknown'}`))

connectBtn.onclick = async () => {
  await client.connect()
}

readBtn.onclick = async () => {
  const values = await client.readHoldingRegisters(0, 4)
  log(`read: ${JSON.stringify(values)}`)
}
