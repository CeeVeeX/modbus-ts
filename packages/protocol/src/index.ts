import { ProtocolError, type ModbusResponse } from '@modbus-ts/core'

const MODBUS_TCP_PROTOCOL_ID = 0
const ASCII_PREFIX = 0x3a // ':'
const ASCII_CR = 0x0d
const ASCII_LF = 0x0a

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

  if (functionCode === 16) {
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
  functionCode?: 3 | 4
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

function buildRtuAdu(unitId: number, pdu: Uint8Array): Uint8Array {
  ensureU16(unitId, 'unitId')
  const adu = new Uint8Array(1 + pdu.length + 2)
  adu[0] = unitId
  adu.set(pdu, 1)
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

export function encodeReadHoldingRegistersRtu(params: {
  unitId: number
  startAddress: number
  quantity: number
  functionCode?: 3 | 4
}): Uint8Array {
  const pdu = buildReadPdu(params)
  return buildRtuAdu(params.unitId, pdu)
}

export function encodeReadHoldingRegistersAscii(params: {
  unitId: number
  startAddress: number
  quantity: number
  functionCode?: 3 | 4
}): Uint8Array {
  const pdu = buildReadPdu(params)
  return buildAsciiAdu(params.unitId, pdu)
}

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

export function encodeWriteSingleRegisterRtu(params: {
  unitId: number
  address: number
  value: number
}): Uint8Array {
  return buildRtuAdu(params.unitId, buildWriteSinglePdu(params))
}

export function encodeWriteSingleRegisterAscii(params: {
  unitId: number
  address: number
  value: number
}): Uint8Array {
  return buildAsciiAdu(params.unitId, buildWriteSinglePdu(params))
}

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

export function encodeWriteMultipleRegistersRtu(params: {
  unitId: number
  startAddress: number
  values: number[]
}): Uint8Array {
  return buildRtuAdu(params.unitId, buildWriteMultiplePdu(params))
}

export function encodeWriteMultipleRegistersAscii(params: {
  unitId: number
  startAddress: number
  values: number[]
}): Uint8Array {
  return buildAsciiAdu(params.unitId, buildWriteMultiplePdu(params))
}

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

export function decodeResponseByMode(frame: Uint8Array, mode: ModbusWireMode): ModbusResponse {
  if (mode === 'rtu') {
    return decodeResponseRtu(frame)
  }
  if (mode === 'ascii') {
    return decodeResponseAscii(frame)
  }
  return decodeResponse(frame)
}

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
