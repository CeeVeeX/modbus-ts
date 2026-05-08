# Composition Examples

以下示例展示多包协作的典型链路。

## 1) Node TCP + Client + Subscription + Codec

场景：TCP 直连 PLC，读取寄存器后解码浮点，同时启用订阅轮询。

```ts
import { ModbusClient } from '@modbus-ts/client'
import { TcpTransport } from '@modbus-ts/transport-tcp'
import { decodeFloat32 } from '@modbus-ts/codec'

const client = new ModbusClient({
  transport: new TcpTransport({ host: '127.0.0.1', port: 502 }),
  defaultUnitId: 1,
})

await client.connect()

const regs = await client.readHoldingRegisters(100, 2)
const temperature = decodeFloat32(regs)
console.log('temperature:', temperature)

const inputRegs = await client.readInputRegisters(100, 2)
console.log('input registers:', inputRegs)

const coils = await client.readCoils(0, 8)
console.log('coils:', coils)

const discreteInputs = await client.readDiscreteInputs(0, 8)
console.log('discrete inputs:', discreteInputs)

await client.writeSingleCoil(10, true)
await client.writeMultipleCoils(20, [true, false, true])

const unsubscribe = client.subscribe({
  start: 100,
  length: 2,
  interval: 500,
  callback: (values) => {
    console.log('polling temperature:', decodeFloat32(values))
  },
})

setTimeout(async () => {
  unsubscribe()
  await client.close()
}, 5000)
```

## 2) Node UDP + RTU Mode + Priority Scheduling

场景：UDP + RTU 模式，通过优先级让写请求抢占读/轮询。

```ts
import { ModbusClient } from '@modbus-ts/client'
import { UdpTransport } from '@modbus-ts/transport-udp'

const client = new ModbusClient({
  transport: new UdpTransport({ host: '127.0.0.1', port: 502 }),
  mode: 'rtu',
  defaultUnitId: 1,
})

await client.connect()

// 读: priority=50
void client.readHoldingRegisters(0, 5, { priority: 50 })
void client.readInputRegisters(0, 5, { priority: 50 })
void client.readCoils(0, 8, { priority: 50 })
void client.readDiscreteInputs(0, 8, { priority: 50 })

// 写: priority=100，优先级更高
await client.writeSingleRegister(10, 123, { priority: 100 })
await client.writeSingleCoil(11, true, { priority: 100 })
await client.writeMultipleCoils(12, [true, false, true], { priority: 100 })

await client.close()
```

## 3) Browser + WsTransport + Gateway

场景：浏览器不直连 PLC，通过 gateway 做 ws<->tcp 二进制 relay。

main process / node side:

```ts
import { ModbusGateway } from '@modbus-ts/gateway'

const gateway = new ModbusGateway({
  wsPort: 18080,
  plcHost: '127.0.0.1',
  plcPort: 502,
})

await gateway.start()
```

browser side:

```ts
import { ModbusClient } from '@modbus-ts/client'
import { WsTransport } from '@modbus-ts/transport-ws'

const client = new ModbusClient({
  transport: new WsTransport({ url: 'ws://127.0.0.1:18080' }),
  defaultUnitId: 1,
})

await client.connect()
const regs = await client.readHoldingRegisters(0, 4)
console.log('browser read:', regs)

const coils = await client.readCoils(0, 8)
console.log('browser coils:', coils)

const discreteInputs = await client.readDiscreteInputs(0, 8)
console.log('browser discrete inputs:', discreteInputs)
```

## 4) Electron Renderer + IPC Transport + Main TCP Bridge

场景：renderer 通过 IPC 请求 main 进程访问 PLC。

renderer:

```ts
import { ModbusClient } from '@modbus-ts/client'
import { ElectronIpcTransport } from '@modbus-ts/transport-electron-ipc'

const client = new ModbusClient({
  transport: new ElectronIpcTransport({ ipc: window.modbusIpc }),
  defaultUnitId: 1,
})

await client.connect()
const regs = await client.readHoldingRegisters(0, 4)
console.log(regs)
```

main:

```ts
import net from 'node:net'
import { BrowserWindow, ipcMain } from 'electron'

let socket: net.Socket | null = null

ipcMain.handle('modbus:connect', async () => {
  if (socket) return
  socket = net.createConnection({ host: '127.0.0.1', port: 502 })
})

ipcMain.handle('modbus:send', async (_e, frame: Uint8Array) => {
  socket?.write(frame)
})

ipcMain.handle('modbus:close', async () => {
  socket?.destroy()
  socket = null
})

function bindSocketToWindow(win: BrowserWindow): void {
  socket?.on('data', (chunk) => win.webContents.send('modbus:data', new Uint8Array(chunk)))
  socket?.on('close', () => win.webContents.send('modbus:closed', { message: 'closed' }))
}
```
