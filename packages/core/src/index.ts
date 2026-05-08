export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'closing'
  | 'closed'
  | 'reconnecting'

export interface Transport {
  connect(): Promise<void>
  close(): Promise<void>
  send(data: Uint8Array): Promise<void>
  onData(cb: (data: Uint8Array) => void): void
  onClose(cb: (err?: Error) => void): void
}

export interface ModbusRequest {
  transactionId: number
  unitId: number
  functionCode: 1 | 2 | 3 | 4 | 5 | 6 | 15 | 16
  startAddress: number
  quantity?: number
  values?: number[]
  coilValue?: boolean
  coilValues?: boolean[]
}

export interface ModbusResponse {
  transactionId: number
  unitId: number
  functionCode: number
  success: boolean
  registers?: number[]
  coils?: boolean[]
  discreteInputs?: boolean[]
  startAddress?: number
  quantity?: number
  value?: number
  coilValue?: boolean
  exceptionCode?: number
}

export interface RequestTask<T = unknown> {
  id: number
  priority: number
  timeout: number
  execute(): Promise<T>
  resolve(value: T): void
  reject(err: Error): void
}

export interface Subscription {
  id: string
  unitId: number
  start: number
  length: number
  interval: number
  callback: (registers: number[]) => void
}

export class TimeoutError extends Error {
  constructor(message = 'request timeout') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class ConnectionClosedError extends Error {
  constructor(message = 'connection closed') {
    super(message)
    this.name = 'ConnectionClosedError'
  }
}

export class ProtocolError extends Error {
  constructor(message = 'protocol error') {
    super(message)
    this.name = 'ProtocolError'
  }
}

export class TransportError extends Error {
  constructor(message = 'transport error') {
    super(message)
    this.name = 'TransportError'
  }
}
