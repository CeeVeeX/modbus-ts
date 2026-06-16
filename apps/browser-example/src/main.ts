import { ModbusClient } from '@modbus-ts/client'
import { decodeAsciiString, encodeAsciiString } from '@modbus-ts/codec'
import { WsTransport } from '@modbus-ts/transport-ws'

const logNode = document.querySelector<HTMLPreElement>('#log')
const connectBtn = document.querySelector<HTMLButtonElement>('#connect')
const readBtn = document.querySelector<HTMLButtonElement>('#read')
const writeBtn = document.querySelector<HTMLButtonElement>('#write')
const writeValueInput = document.querySelector<HTMLInputElement>('#write-value')
const startAdvancedBtn = document.querySelector<HTMLButtonElement>('#start-advanced')
const stopAdvancedBtn = document.querySelector<HTMLButtonElement>('#stop-advanced')
const asciiStartInput = document.querySelector<HTMLInputElement>('#ascii-start')
const asciiQuantityInput = document.querySelector<HTMLInputElement>('#ascii-quantity')
const asciiPadInput = document.querySelector<HTMLInputElement>('#ascii-pad')
const asciiCodesInput = document.querySelector<HTMLInputElement>('#ascii-codes')
const asciiWriteBtn = document.querySelector<HTMLButtonElement>('#ascii-write')
const asciiReadBtn = document.querySelector<HTMLButtonElement>('#ascii-read')

if (
  !logNode ||
  !connectBtn ||
  !readBtn ||
  !writeBtn ||
  !writeValueInput ||
  !startAdvancedBtn ||
  !stopAdvancedBtn ||
  !asciiStartInput ||
  !asciiQuantityInput ||
  !asciiPadInput ||
  !asciiCodesInput ||
  !asciiWriteBtn ||
  !asciiReadBtn
) {
  throw new Error('缺少页面节点')
}

const log = (line: string) => {
  logNode.textContent += `${line}\n`
}

const wsUrl = import.meta.env.VITE_MODBUS_WS_URL ?? 'ws://127.0.0.1:18080'
const transport = new WsTransport({ url: wsUrl })
const client = new ModbusClient({ transport, defaultUnitId: 1 })
const advancedUnsubscribers: Array<() => void> = []

function parseU16(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error('期望输入 0..65535 的整数')
  }
  return parsed
}

function parseAsciiTextInput(input: string): { text: string; asciiCodes: number[] } {
  const text = input.trim()
  if (text.length === 0) {
    throw new Error('ASCII 文本输入为空')
  }

  const asciiCodes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0 || code > 127) {
      throw new Error(`包含非 ASCII 字符，位置 ${i}`)
    }
    asciiCodes.push(code)
  }

  return { text, asciiCodes }
}

function registersToAsciiCodes(registers: number[]): number[] {
  const out: number[] = []
  for (const reg of registers) {
    out.push((reg >> 8) & 0xff, reg & 0xff)
  }
  return out
}

function describeModbusException(code: number): string {
  switch (code) {
    case 1:
      return '非法功能码 (Illegal Function)'
    case 2:
      return '非法数据地址 (Illegal Data Address)：寄存器起始地址或长度超出设备映射范围'
    case 3:
      return '非法数据值 (Illegal Data Value)：参数值不被设备接受'
    case 4:
      return '从站设备故障 (Slave Device Failure)'
    default:
      return `未知 Modbus 异常码 ${code}`
  }
}

function formatErrorMessage(error: unknown): string {
  const message = (error as Error)?.message ?? '未知错误'
  const match = /modbus exception\s+(\d+)/i.exec(message)
  if (!match) {
    return message
  }

  const code = Number.parseInt(match[1], 10)
  const detail = describeModbusException(code)
  if (code === 2) {
    return `${detail}。请尝试减小“起始寄存器”或“读取长度”，并确认 PLC 地址表允许写入该区间。`
  }
  return detail
}

client.on('connect', () => log('已连接'))
client.on('disconnect', () => log('已断开'))
client.on('timeout', () => log('请求超时'))
client.on('error', (err) => log(`错误：${formatErrorMessage(err)}`))

connectBtn.onclick = async () => {
  log(`正在连接网关：${wsUrl}`)
  await client.connect()
}

readBtn.onclick = async () => {
  const values = await client.readHoldingRegisters(0, 4, { priority: 50 })
  log(`读取保持寄存器：${JSON.stringify(values)}`)

  const inputRegs = await client.readInputRegisters(0, 4, { priority: 50 })
  log(`读取输入寄存器：${JSON.stringify(inputRegs)}`)

  const coils = await client.readCoils(0, 8, { priority: 50 })
  log(`读取线圈：${JSON.stringify(coils)}`)

  const discreteInputs = await client.readDiscreteInputs(0, 8, { priority: 50 })
  log(`读取离散输入：${JSON.stringify(discreteInputs)}`)
}

writeBtn.onclick = async () => {
  const value = Number.parseInt(writeValueInput.value, 10)
  if (Number.isNaN(value) || value < 0 || value > 65535) {
    log('写入失败：数值无效，应为 0-65535')
    return
  }

  await client.writeSingleRegister(0, value, { priority: 100 })
  log(`写入完成：寄存器=0 数值=${value}（priority=100）`)

  await client.writeSingleCoil(1, true, { priority: 100 })
  log('写入完成：单线圈 addr=1 value=true（priority=100）')

  await client.writeMultipleCoils(2, [true, false, true], { priority: 100 })
  log('写入完成：多线圈 start=2 values=[true,false,true]（priority=100）')
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
  log('已启动高级订阅（合并 + 去重 + 轮询）')
}

stopAdvancedBtn.onclick = () => {
  while (advancedUnsubscribers.length > 0) {
    const unsubscribe = advancedUnsubscribers.pop()
    unsubscribe?.()
  }
  startAdvancedBtn.disabled = false
  stopAdvancedBtn.disabled = true
  log('已停止高级订阅')
}

asciiWriteBtn.onclick = async () => {
  try {
    const start = parseU16(asciiStartInput.value)
    const quantity = Number.parseInt(asciiQuantityInput.value, 10)
    const padByte = Number.parseInt(asciiPadInput.value, 10)
    if (!Number.isInteger(padByte) || padByte < 0 || padByte > 255) {
      log('ASCII 写入失败：补位字节无效，应为 0-255')
      return
    }

    const { text: asciiText, asciiCodes } = parseAsciiTextInput(asciiCodesInput.value)
    const registers = encodeAsciiString(asciiText, { padByte, length: quantity, truncate: true })

    await client.writeMultipleRegisters(start, registers, { priority: 100 })

    log(
      `ASCII 写入：start=${start} codes=[${asciiCodes.join(',')}] text="${asciiText}" regs=${JSON.stringify(registers)}`,
    )
  } catch (error) {
    log(`ASCII 写入错误：${formatErrorMessage(error)}`)
  }
}

asciiReadBtn.onclick = async () => {
  try {
    const start = parseU16(asciiStartInput.value)
    const quantity = Number.parseInt(asciiQuantityInput.value, 10)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 123) {
      log('ASCII 读取失败：长度无效，应为 1-123')
      return
    }

    const registers = await client.readHoldingRegisters(start, quantity, { priority: 50 })
    const text = decodeAsciiString(registers)
    const asciiCodes = registersToAsciiCodes(registers)

    log(
      `ASCII 读取：start=${start} qty=${quantity} regs=${JSON.stringify(registers)} text="${text}" codes=[${asciiCodes.join(',')}]`,
    )
  } catch (error) {
    log(`ASCII 读取错误：${formatErrorMessage(error)}`)
  }
}
