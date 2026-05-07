import { ProtocolError, type ModbusResponse } from '@modbus-ts/core'

const MODBUS_TCP_PROTOCOL_ID = 0

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

export function encodeReadHoldingRegisters(params: {
  transactionId: number
  unitId: number
  startAddress: number
  quantity: number
  functionCode?: 3 | 4
}): Uint8Array {
  const { transactionId, unitId, startAddress, quantity, functionCode = 3 } = params
  ensureU16(startAddress, 'startAddress')
  ensureU16(quantity, 'quantity')
  const mbap = buildMbap(transactionId, unitId, 5)
  const pdu = new Uint8Array(5)
  const pduView = new DataView(pdu.buffer)
  pduView.setUint8(0, functionCode)
  pduView.setUint16(1, startAddress)
  pduView.setUint16(3, quantity)

  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
}

export function encodeWriteSingleRegister(params: {
  transactionId: number
  unitId: number
  address: number
  value: number
}): Uint8Array {
  const { transactionId, unitId, address, value } = params
  ensureU16(address, 'address')
  ensureU16(value, 'value')
  const mbap = buildMbap(transactionId, unitId, 5)
  const pdu = new Uint8Array(5)
  const pduView = new DataView(pdu.buffer)
  pduView.setUint8(0, 6)
  pduView.setUint16(1, address)
  pduView.setUint16(3, value)

  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
}

export function encodeWriteMultipleRegisters(params: {
  transactionId: number
  unitId: number
  startAddress: number
  values: number[]
}): Uint8Array {
  const { transactionId, unitId, startAddress, values } = params
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

  const mbap = buildMbap(transactionId, unitId, pdu.length)
  const frame = new Uint8Array(mbap.length + pdu.length)
  frame.set(mbap, 0)
  frame.set(pdu, mbap.length)
  return frame
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
  if ((functionCode & 0x80) !== 0) {
    return {
      transactionId,
      unitId,
      functionCode,
      success: false,
      exceptionCode: view.getUint8(8),
    }
  }

  if (functionCode === 3 || functionCode === 4) {
    const byteCount = view.getUint8(8)
    if (frame.length !== 9 + byteCount || byteCount % 2 !== 0) {
      throw new ProtocolError('invalid read response payload')
    }
    const registers: number[] = []
    for (let i = 0; i < byteCount; i += 2) {
      registers.push(view.getUint16(9 + i))
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
    return {
      transactionId,
      unitId,
      functionCode,
      success: true,
      startAddress: view.getUint16(8),
      value: view.getUint16(10),
    }
  }

  if (functionCode === 16) {
    return {
      transactionId,
      unitId,
      functionCode,
      success: true,
      startAddress: view.getUint16(8),
      quantity: view.getUint16(10),
    }
  }

  throw new ProtocolError(`unsupported function code ${functionCode}`)
}
