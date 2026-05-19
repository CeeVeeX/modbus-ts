import { ProtocolError, type ModbusResponse } from '@modbus-ts/core'

const MODBUS_TCP_PROTOCOL_ID = 0
const ASCII_PREFIX = 0x3a // ':'
const ASCII_CR = 0x0d
const ASCII_LF = 0x0a

/**
 * 协议传输线模式。
 * @example
 * ```ts
 * const mode: ModbusWireMode = 'ascii'
 * ```
 */
export type ModbusWireMode = 'tcp' | 'rtu' | 'ascii'

function ensureU16(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new ProtocolError(`${field} must be uint16`)
  }
}

function buildMbap(transactionId: number, unitId: number, pduLength: number): Uint8Array {
  ensureU16(transactionId, 'transactionId')
  ensureU16(unitId, 'unitId')
  const header = new Uint8Array(7)
  const view = new DataView(header.buffer)
  view.setUint16(0, transactionId)
  view.setUint16(2, MODBUS_TCP_PROTOCOL_ID)
  view.setUint16(4, pduLength + 1)
  view.setUint8(6, unitId)
  return header
}

function toHexByte(v: number): string {
  return v.toString(16).padStart(2, '0').toUpperCase()
}

function fromHexByte(hex: string): number {
  const value = Number.parseInt(hex, 16)
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new ProtocolError('invalid ascii hex byte')
  }
  return value
}

function crc16Modbus(data: Uint8Array): number {
  let crc = 0xffff
  for (const byte of data) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      const lsb = crc & 1
      crc >>= 1
      if (lsb) {
        crc ^= 0xa001
      }
    }
  }
  return crc & 0xffff
}

function lrc(data: Uint8Array): number {
  let sum = 0
  for (const b of data) {
    sum = (sum + b) & 0xff
  }
  return (~sum + 1) & 0xff
}

function decodePduFields(params: {
  unitId: number
  functionCode: number
  payload: Uint8Array
  transactionId: number
}): ModbusResponse {
  const { unitId, functionCode, payload, transactionId } = params

  // 异常响应约定：功能码最高位为 1，首字节是异常码。
  if ((functionCode & 0x80) !== 0) {
    if (payload.length < 1) {
      throw new ProtocolError('invalid exception payload')
    }
    return {
      transactionId,
      unitId,
      functionCode,
      success: false,
      exceptionCode: payload[0],
    }
  }

  const payloadView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  if (functionCode === 1 || functionCode === 2) {
    const byteCount = payloadView.getUint8(0)
    if (payload.length !== 1 + byteCount) {
      throw new ProtocolError('invalid coil read response payload')
    }

    const bits: boolean[] = []
    for (let i = 0; i < byteCount; i++) {
      const byte = payloadView.getUint8(1 + i)
      for (let bit = 0; bit < 8; bit++) {
        bits.push(((byte >> bit) & 1) === 1)
      }
    }

    return {
      transactionId,
      unitId,
      functionCode,
      success: true,
      ...(functionCode === 1 ? { coils: bits } : { discreteInputs: bits }),
    }
  }

  if (functionCode === 3 || functionCode === 4) {
    const byteCount = payloadView.getUint8(0)
    if (payload.length !== 1 + byteCount || byteCount % 2 !== 0) {
      throw new ProtocolError('invalid read response payload')
    }
    const registers: number[] = []
    for (let i = 0; i < byteCount; i += 2) {
      registers.push(payloadView.getUint16(1 + i))
    }
    return {
      transactionId,
      unitId,
      functionCode,
      success: true,
      registers,
    }
  }

  if (functionCode === 5) {
    if (payload.length !== 4) {
      throw new ProtocolError('invalid write single coil response payload')
    }
    const rawValue = payloadView.getUint16(2)
    if (rawValue !== 0x0000 && rawValue !== 0xff00) {
      throw new ProtocolError('invalid write single coil response value')
    }
    return {
      transactionId,
      unitId,
      functionCode,
      success: true,
      startAddress: payloadView.getUint16(0),
      value: rawValue,
      coilValue: rawValue === 0xff00,
    }
  }

  if (functionCode === 6) {
    if (payload.length !== 4) {
      throw new ProtocolError('invalid write single response payload')
    }
    return {
      transactionId,
      unitId,
      functionCode,
      success: true,
      startAddress: payloadView.getUint16(0),
      value: payloadView.getUint16(2),
    }
  }

  if (functionCode === 15 || functionCode === 16) {
    if (payload.length !== 4) {
      throw new ProtocolError('invalid write multiple response payload')
    }
    return {
      transactionId,
      unitId,
      functionCode,
      success: true,
      startAddress: payloadView.getUint16(0),
      quantity: payloadView.getUint16(2),
    }
  }

  throw new ProtocolError(`unsupported function code ${functionCode}`)
}

function buildReadPdu(params: {
  startAddress: number
  quantity: number
  functionCode?: 1 | 2 | 3 | 4
}): Uint8Array {
  const { startAddress, quantity, functionCode = 3 } = params
  ensureU16(startAddress, 'startAddress')
  ensureU16(quantity, 'quantity')

  const pdu = new Uint8Array(5)
  const pduView = new DataView(pdu.buffer)
  pduView.setUint8(0, functionCode)
  pduView.setUint16(1, startAddress)
  pduView.setUint16(3, quantity)
  return pdu
}

function buildWriteSinglePdu(params: { address: number; value: number }): Uint8Array {
  const { address, value } = params
  ensureU16(address, 'address')
  ensureU16(value, 'value')

  const pdu = new Uint8Array(5)
  const pduView = new DataView(pdu.buffer)
  pduView.setUint8(0, 6)
  pduView.setUint16(1, address)
  pduView.setUint16(3, value)
  return pdu
}

function buildWriteSingleCoilPdu(params: { address: number; value: boolean }): Uint8Array {
  const { address, value } = params
  ensureU16(address, 'address')

  const pdu = new Uint8Array(5)
  const pduView = new DataView(pdu.buffer)
  pduView.setUint8(0, 5)
  pduView.setUint16(1, address)
  pduView.setUint16(3, value ? 0xff00 : 0x0000)
  return pdu
}

function buildWriteMultiplePdu(params: { startAddress: number; values: number[] }): Uint8Array {
  const { startAddress, values } = params
  ensureU16(startAddress, 'startAddress')
  if (values.length === 0 || values.length > 123) {
    throw new ProtocolError('values length must be 1..123')
  }

  const byteCount = values.length * 2
  const pdu = new Uint8Array(6 + byteCount)
  const pduView = new DataView(pdu.buffer)
  pduView.setUint8(0, 16)
  pduView.setUint16(1, startAddress)
  pduView.setUint16(3, values.length)
  pduView.setUint8(5, byteCount)
  values.forEach((v, idx) => {
    ensureU16(v, `values[${idx}]`)
    pduView.setUint16(6 + idx * 2, v)
  })

  return pdu
}

function buildWriteMultipleCoilsPdu(params: {
  startAddress: number
  values: boolean[]
}): Uint8Array {
  const { startAddress, values } = params
  ensureU16(startAddress, 'startAddress')
  if (values.length === 0 || values.length > 1968) {
    throw new ProtocolError('coil values length must be 1..1968')
  }

  const byteCount = Math.ceil(values.length / 8)
  const pdu = new Uint8Array(6 + byteCount)
  const pduView = new DataView(pdu.buffer)
  pduView.setUint8(0, 15)
  pduView.setUint16(1, startAddress)
  pduView.setUint16(3, values.length)
  pduView.setUint8(5, byteCount)

  for (let i = 0; i < values.length; i++) {
    if (values[i]) {
      const byteOffset = 6 + Math.floor(i / 8)
      const bitOffset = i % 8
      pdu[byteOffset] |= 1 << bitOffset
    }
  }

  return pdu
}

/**
 * 编码 FC1 读取线圈请求（TCP）。
 * @example
 * ```ts
 * const frame = encodeReadCoils({ transactionId: 1, unitId: 1, startAddress: 0, quantity: 8 })
 * ```
 */
export function encodeReadCoils(params: {
  transactionId: number
  unitId: number
  startAddress: number
  quantity: number
}): Uint8Array {
  const { transactionId, unitId, startAddress, quantity } = params
  const mbap = buildMbap(transactionId, unitId, 5)
  const pdu = buildReadPdu({ startAddress, quantity, functionCode: 1 })

  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
}

/**
 * 编码 FC2 读取离散输入请求（TCP）。
 * @example
 * ```ts
 * const frame = encodeReadDiscreteInputs({ transactionId: 1, unitId: 1, startAddress: 0, quantity: 8 })
 * ```
 */
export function encodeReadDiscreteInputs(params: {
  transactionId: number
  unitId: number
  startAddress: number
  quantity: number
}): Uint8Array {
  const { transactionId, unitId, startAddress, quantity } = params
  const mbap = buildMbap(transactionId, unitId, 5)
  const pdu = buildReadPdu({ startAddress, quantity, functionCode: 2 })

  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
}

/**
 * 编码 FC1 读取线圈请求（RTU）。
 * @example
 * ```ts
 * const frame = encodeReadCoilsRtu({ unitId: 1, startAddress: 0, quantity: 8 })
 * ```
 */
export function encodeReadCoilsRtu(params: {
  unitId: number
  startAddress: number
  quantity: number
}): Uint8Array {
  const pdu = buildReadPdu({ ...params, functionCode: 1 })
  return buildRtuAdu(params.unitId, pdu)
}

/**
 * 编码 FC2 读取离散输入请求（RTU）。
 * @example
 * ```ts
 * const frame = encodeReadDiscreteInputsRtu({ unitId: 1, startAddress: 0, quantity: 8 })
 * ```
 */
export function encodeReadDiscreteInputsRtu(params: {
  unitId: number
  startAddress: number
  quantity: number
}): Uint8Array {
  const pdu = buildReadPdu({ ...params, functionCode: 2 })
  return buildRtuAdu(params.unitId, pdu)
}

/**
 * 编码 FC1 读取线圈请求（ASCII）。
 * @example
 * ```ts
 * const frame = encodeReadCoilsAscii({ unitId: 1, startAddress: 0, quantity: 8 })
 * ```
 */
export function encodeReadCoilsAscii(params: {
  unitId: number
  startAddress: number
  quantity: number
}): Uint8Array {
  const pdu = buildReadPdu({ ...params, functionCode: 1 })
  return buildAsciiAdu(params.unitId, pdu)
}

/**
 * 编码 FC2 读取离散输入请求（ASCII）。
 * @example
 * ```ts
 * const frame = encodeReadDiscreteInputsAscii({ unitId: 1, startAddress: 0, quantity: 8 })
 * ```
 */
export function encodeReadDiscreteInputsAscii(params: {
  unitId: number
  startAddress: number
  quantity: number
}): Uint8Array {
  const pdu = buildReadPdu({ ...params, functionCode: 2 })
  return buildAsciiAdu(params.unitId, pdu)
}

function buildRtuAdu(unitId: number, pdu: Uint8Array): Uint8Array {
  ensureU16(unitId, 'unitId')
  const adu = new Uint8Array(1 + pdu.length + 2)
  adu[0] = unitId
  adu.set(pdu, 1)
  // RTU CRC 仅覆盖 unitId + pdu，不包含末尾 CRC 自身字节。
  const crc = crc16Modbus(adu.subarray(0, adu.length - 2))
  adu[adu.length - 2] = crc & 0xff
  adu[adu.length - 1] = (crc >> 8) & 0xff
  return adu
}

function buildAsciiAdu(unitId: number, pdu: Uint8Array): Uint8Array {
  ensureU16(unitId, 'unitId')
  const body = new Uint8Array(1 + pdu.length)
  body[0] = unitId
  body.set(pdu, 1)
  const checksum = lrc(body)
  const payloadHex = [...body, checksum].map(toHexByte).join('')
  const text = `:${payloadHex}\r\n`
  return Uint8Array.from([...text].map((c) => c.charCodeAt(0)))
}

/**
 * 编码 FC3/FC4 读取寄存器请求（TCP）。
 * @example
 * ```ts
 * const frame = encodeReadHoldingRegisters({ transactionId: 1, unitId: 1, startAddress: 0, quantity: 2 })
 * ```
 */
export function encodeReadHoldingRegisters(params: {
  transactionId: number
  unitId: number
  startAddress: number
  quantity: number
  functionCode?: 3 | 4
}): Uint8Array {
  const { transactionId, unitId, startAddress, quantity, functionCode = 3 } = params
  const mbap = buildMbap(transactionId, unitId, 5)
  const pdu = buildReadPdu({ startAddress, quantity, functionCode })

  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
}

/**
 * 编码 FC3/FC4 读取寄存器请求（RTU）。
 * @example
 * ```ts
 * const frame = encodeReadHoldingRegistersRtu({ unitId: 1, startAddress: 0, quantity: 2 })
 * ```
 */
export function encodeReadHoldingRegistersRtu(params: {
  unitId: number
  startAddress: number
  quantity: number
  functionCode?: 3 | 4
}): Uint8Array {
  const pdu = buildReadPdu(params)
  return buildRtuAdu(params.unitId, pdu)
}

/**
 * 编码 FC3/FC4 读取寄存器请求（ASCII）。
 * @example
 * ```ts
 * const frame = encodeReadHoldingRegistersAscii({ unitId: 1, startAddress: 0, quantity: 2 })
 * ```
 */
export function encodeReadHoldingRegistersAscii(params: {
  unitId: number
  startAddress: number
  quantity: number
  functionCode?: 3 | 4
}): Uint8Array {
  const pdu = buildReadPdu(params)
  return buildAsciiAdu(params.unitId, pdu)
}

/**
 * 编码 FC6 写单寄存器请求（TCP）。
 * @example
 * ```ts
 * const frame = encodeWriteSingleRegister({ transactionId: 1, unitId: 1, address: 100, value: 123 })
 * ```
 */
export function encodeWriteSingleRegister(params: {
  transactionId: number
  unitId: number
  address: number
  value: number
}): Uint8Array {
  const { transactionId, unitId, address, value } = params
  const mbap = buildMbap(transactionId, unitId, 5)
  const pdu = buildWriteSinglePdu({ address, value })

  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
}

/**
 * 编码 FC5 写单线圈请求（TCP）。
 * @example
 * ```ts
 * const frame = encodeWriteSingleCoil({ transactionId: 1, unitId: 1, address: 10, value: true })
 * ```
 */
export function encodeWriteSingleCoil(params: {
  transactionId: number
  unitId: number
  address: number
  value: boolean
}): Uint8Array {
  const { transactionId, unitId, address, value } = params
  const mbap = buildMbap(transactionId, unitId, 5)
  const pdu = buildWriteSingleCoilPdu({ address, value })

  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
}

/**
 * 编码 FC5 写单线圈请求（RTU）。
 * @example
 * ```ts
 * const frame = encodeWriteSingleCoilRtu({ unitId: 1, address: 10, value: true })
 * ```
 */
export function encodeWriteSingleCoilRtu(params: {
  unitId: number
  address: number
  value: boolean
}): Uint8Array {
  return buildRtuAdu(params.unitId, buildWriteSingleCoilPdu(params))
}

/**
 * 编码 FC5 写单线圈请求（ASCII）。
 * @example
 * ```ts
 * const frame = encodeWriteSingleCoilAscii({ unitId: 1, address: 10, value: true })
 * ```
 */
export function encodeWriteSingleCoilAscii(params: {
  unitId: number
  address: number
  value: boolean
}): Uint8Array {
  return buildAsciiAdu(params.unitId, buildWriteSingleCoilPdu(params))
}

/**
 * 编码 FC6 写单寄存器请求（RTU）。
 * @example
 * ```ts
 * const frame = encodeWriteSingleRegisterRtu({ unitId: 1, address: 100, value: 123 })
 * ```
 */
export function encodeWriteSingleRegisterRtu(params: {
  unitId: number
  address: number
  value: number
}): Uint8Array {
  return buildRtuAdu(params.unitId, buildWriteSinglePdu(params))
}

/**
 * 编码 FC6 写单寄存器请求（ASCII）。
 * @example
 * ```ts
 * const frame = encodeWriteSingleRegisterAscii({ unitId: 1, address: 100, value: 123 })
 * ```
 */
export function encodeWriteSingleRegisterAscii(params: {
  unitId: number
  address: number
  value: number
}): Uint8Array {
  return buildAsciiAdu(params.unitId, buildWriteSinglePdu(params))
}

/**
 * 编码 FC16 连续写寄存器请求（TCP）。
 * @example
 * ```ts
 * const frame = encodeWriteMultipleRegisters({ transactionId: 1, unitId: 1, startAddress: 0, values: [1, 2, 3] })
 * ```
 */
export function encodeWriteMultipleRegisters(params: {
  transactionId: number
  unitId: number
  startAddress: number
  values: number[]
}): Uint8Array {
  const { transactionId, unitId, startAddress, values } = params
  const pdu = buildWriteMultiplePdu({ startAddress, values })

  const mbap = buildMbap(transactionId, unitId, pdu.length)
  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
}

/**
 * 编码 FC15 连续写线圈请求（TCP）。
 * @example
 * ```ts
 * const frame = encodeWriteMultipleCoils({ transactionId: 1, unitId: 1, startAddress: 0, values: [true, false] })
 * ```
 */
export function encodeWriteMultipleCoils(params: {
  transactionId: number
  unitId: number
  startAddress: number
  values: boolean[]
}): Uint8Array {
  const { transactionId, unitId, startAddress, values } = params
  const pdu = buildWriteMultipleCoilsPdu({ startAddress, values })

  const mbap = buildMbap(transactionId, unitId, pdu.length)
  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
}

/**
 * 编码 FC15 连续写线圈请求（RTU）。
 * @example
 * ```ts
 * const frame = encodeWriteMultipleCoilsRtu({ unitId: 1, startAddress: 0, values: [true, false] })
 * ```
 */
export function encodeWriteMultipleCoilsRtu(params: {
  unitId: number
  startAddress: number
  values: boolean[]
}): Uint8Array {
  return buildRtuAdu(params.unitId, buildWriteMultipleCoilsPdu(params))
}

/**
 * 编码 FC15 连续写线圈请求（ASCII）。
 * @example
 * ```ts
 * const frame = encodeWriteMultipleCoilsAscii({ unitId: 1, startAddress: 0, values: [true, false] })
 * ```
 */
export function encodeWriteMultipleCoilsAscii(params: {
  unitId: number
  startAddress: number
  values: boolean[]
}): Uint8Array {
  return buildAsciiAdu(params.unitId, buildWriteMultipleCoilsPdu(params))
}

/**
 * 编码 FC16 连续写寄存器请求（RTU）。
 * @example
 * ```ts
 * const frame = encodeWriteMultipleRegistersRtu({ unitId: 1, startAddress: 0, values: [1, 2, 3] })
 * ```
 */
export function encodeWriteMultipleRegistersRtu(params: {
  unitId: number
  startAddress: number
  values: number[]
}): Uint8Array {
  return buildRtuAdu(params.unitId, buildWriteMultiplePdu(params))
}

/**
 * 编码 FC16 连续写寄存器请求（ASCII）。
 * @example
 * ```ts
 * const frame = encodeWriteMultipleRegistersAscii({ unitId: 1, startAddress: 0, values: [1, 2, 3] })
 * ```
 */
export function encodeWriteMultipleRegistersAscii(params: {
  unitId: number
  startAddress: number
  values: number[]
}): Uint8Array {
  return buildAsciiAdu(params.unitId, buildWriteMultiplePdu(params))
}

/**
 * 解码 Modbus TCP 响应帧。
 * @example
 * ```ts
 * const res = decodeResponse(frame)
 * if (res.success && 'registers' in res) console.log(res.registers)
 * ```
 */
export function decodeResponse(frame: Uint8Array): ModbusResponse {
  if (frame.length < 8) {
    throw new ProtocolError('frame too short')
  }

  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
  const transactionId = view.getUint16(0)
  const protocolId = view.getUint16(2)
  const length = view.getUint16(4)
  const unitId = view.getUint8(6)

  if (protocolId !== MODBUS_TCP_PROTOCOL_ID) {
    throw new ProtocolError('invalid protocol id')
  }

  // MBAP 的 length 字段从 unitId 开始计数，因此总帧长应为 length + 6。
  if (length + 6 !== frame.length) {
    throw new ProtocolError('invalid mbap length')
  }

  const functionCode = view.getUint8(7)
  return decodePduFields({
    unitId,
    functionCode,
    payload: frame.subarray(8),
    transactionId,
  })
}

/**
 * 解码 Modbus RTU 响应帧。
 * @example
 * ```ts
 * const res = decodeResponseRtu(frame)
 * ```
 */
export function decodeResponseRtu(frame: Uint8Array): ModbusResponse {
  if (frame.length < 5) {
    throw new ProtocolError('rtu frame too short')
  }

  const receivedCrc = frame[frame.length - 2] | (frame[frame.length - 1] << 8)
  const body = frame.subarray(0, frame.length - 2)
  const expectedCrc = crc16Modbus(body)
  if (receivedCrc !== expectedCrc) {
    throw new ProtocolError('invalid rtu crc')
  }

  const unitId = body[0]
  const functionCode = body[1]
  return decodePduFields({
    unitId,
    functionCode,
    payload: body.subarray(2),
    transactionId: 0,
  })
}

/**
 * 解码 Modbus ASCII 响应帧。
 * @example
 * ```ts
 * const res = decodeResponseAscii(frame)
 * ```
 */
export function decodeResponseAscii(frame: Uint8Array): ModbusResponse {
  if (frame.length < 9) {
    throw new ProtocolError('ascii frame too short')
  }
  if (
    frame[0] !== ASCII_PREFIX ||
    frame[frame.length - 2] !== ASCII_CR ||
    frame[frame.length - 1] !== ASCII_LF
  ) {
    throw new ProtocolError('invalid ascii envelope')
  }

  const hexText = String.fromCharCode(...frame.subarray(1, frame.length - 2))
  if (hexText.length % 2 !== 0) {
    throw new ProtocolError('invalid ascii hex length')
  }

  const raw = new Uint8Array(hexText.length / 2)
  for (let i = 0; i < hexText.length; i += 2) {
    raw[i / 2] = fromHexByte(hexText.slice(i, i + 2))
  }

  if (raw.length < 4) {
    throw new ProtocolError('ascii payload too short')
  }

  const body = raw.subarray(0, raw.length - 1)
  const checksum = raw[raw.length - 1]
  if (lrc(body) !== checksum) {
    throw new ProtocolError('invalid ascii lrc')
  }

  return decodePduFields({
    unitId: body[0],
    functionCode: body[1],
    payload: body.subarray(2),
    transactionId: 0,
  })
}

/**
 * 按模式分派响应解码。
 * @example
 * ```ts
 * const res = decodeResponseByMode(frame, 'rtu')
 * ```
 */
export function decodeResponseByMode(frame: Uint8Array, mode: ModbusWireMode): ModbusResponse {
  if (mode === 'rtu') {
    return decodeResponseRtu(frame)
  }
  if (mode === 'ascii') {
    return decodeResponseAscii(frame)
  }
  return decodeResponse(frame)
}

/**
 * 按模式编码 FC3/FC4 读取寄存器请求。
 * @example
 * ```ts
 * const frame = encodeReadHoldingRegistersByMode({ mode: 'tcp', transactionId: 1, unitId: 1, startAddress: 0, quantity: 2 })
 * ```
 */
export function encodeReadHoldingRegistersByMode(params: {
  mode: ModbusWireMode
  transactionId: number
  unitId: number
  startAddress: number
  quantity: number
  functionCode?: 3 | 4
}): Uint8Array {
  if (params.mode === 'rtu') {
    return encodeReadHoldingRegistersRtu(params)
  }
  if (params.mode === 'ascii') {
    return encodeReadHoldingRegistersAscii(params)
  }
  return encodeReadHoldingRegisters(params)
}

/**
 * 按模式编码 FC1 读取线圈请求。
 * @example
 * ```ts
 * const frame = encodeReadCoilsByMode({ mode: 'ascii', transactionId: 1, unitId: 1, startAddress: 0, quantity: 8 })
 * ```
 */
export function encodeReadCoilsByMode(params: {
  mode: ModbusWireMode
  transactionId: number
  unitId: number
  startAddress: number
  quantity: number
}): Uint8Array {
  if (params.mode === 'rtu') {
    return encodeReadCoilsRtu(params)
  }
  if (params.mode === 'ascii') {
    return encodeReadCoilsAscii(params)
  }
  return encodeReadCoils(params)
}

/**
 * 按模式编码 FC2 读取离散输入请求。
 * @example
 * ```ts
 * const frame = encodeReadDiscreteInputsByMode({ mode: 'rtu', transactionId: 1, unitId: 1, startAddress: 0, quantity: 8 })
 * ```
 */
export function encodeReadDiscreteInputsByMode(params: {
  mode: ModbusWireMode
  transactionId: number
  unitId: number
  startAddress: number
  quantity: number
}): Uint8Array {
  if (params.mode === 'rtu') {
    return encodeReadDiscreteInputsRtu(params)
  }
  if (params.mode === 'ascii') {
    return encodeReadDiscreteInputsAscii(params)
  }
  return encodeReadDiscreteInputs(params)
}

/**
 * 按模式编码 FC6 写单寄存器请求。
 * @example
 * ```ts
 * const frame = encodeWriteSingleRegisterByMode({ mode: 'tcp', transactionId: 1, unitId: 1, address: 100, value: 123 })
 * ```
 */
export function encodeWriteSingleRegisterByMode(params: {
  mode: ModbusWireMode
  transactionId: number
  unitId: number
  address: number
  value: number
}): Uint8Array {
  if (params.mode === 'rtu') {
    return encodeWriteSingleRegisterRtu(params)
  }
  if (params.mode === 'ascii') {
    return encodeWriteSingleRegisterAscii(params)
  }
  return encodeWriteSingleRegister(params)
}

/**
 * 按模式编码 FC5 写单线圈请求。
 * @example
 * ```ts
 * const frame = encodeWriteSingleCoilByMode({ mode: 'tcp', transactionId: 1, unitId: 1, address: 10, value: true })
 * ```
 */
export function encodeWriteSingleCoilByMode(params: {
  mode: ModbusWireMode
  transactionId: number
  unitId: number
  address: number
  value: boolean
}): Uint8Array {
  if (params.mode === 'rtu') {
    return encodeWriteSingleCoilRtu(params)
  }
  if (params.mode === 'ascii') {
    return encodeWriteSingleCoilAscii(params)
  }
  return encodeWriteSingleCoil(params)
}

/**
 * 按模式编码 FC16 连续写寄存器请求。
 * @example
 * ```ts
 * const frame = encodeWriteMultipleRegistersByMode({ mode: 'rtu', transactionId: 1, unitId: 1, startAddress: 0, values: [1, 2] })
 * ```
 */
export function encodeWriteMultipleRegistersByMode(params: {
  mode: ModbusWireMode
  transactionId: number
  unitId: number
  startAddress: number
  values: number[]
}): Uint8Array {
  if (params.mode === 'rtu') {
    return encodeWriteMultipleRegistersRtu(params)
  }
  if (params.mode === 'ascii') {
    return encodeWriteMultipleRegistersAscii(params)
  }
  return encodeWriteMultipleRegisters(params)
}

/**
 * 按模式编码 FC15 连续写线圈请求。
 * @example
 * ```ts
 * const frame = encodeWriteMultipleCoilsByMode({ mode: 'ascii', transactionId: 1, unitId: 1, startAddress: 0, values: [true, false] })
 * ```
 */
export function encodeWriteMultipleCoilsByMode(params: {
  mode: ModbusWireMode
  transactionId: number
  unitId: number
  startAddress: number
  values: boolean[]
}): Uint8Array {
  if (params.mode === 'rtu') {
    return encodeWriteMultipleCoilsRtu(params)
  }
  if (params.mode === 'ascii') {
    return encodeWriteMultipleCoilsAscii(params)
  }
  return encodeWriteMultipleCoils(params)
}
