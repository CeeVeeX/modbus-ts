/**
 * 连接状态枚举，用于描述传输层生命周期。
 *
 * @example
 * ```ts
 * const state: ConnectionState = 'connected'
 * ```
 */
export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'closing'
  | 'closed'
  | 'reconnecting'

/**
 * 传输层统一接口。
 *
 * @example
 * ```ts
 * async function bootstrap(transport: Transport) {
 *   await transport.connect()
 *   await transport.send(Uint8Array.from([0x01, 0x03]))
 * }
 * ```
 */
export interface Transport {
  connect(): Promise<void>
  close(): Promise<void>
  send(data: Uint8Array): Promise<void>
  onData(cb: (data: Uint8Array) => void): void
  onClose(cb: (err?: Error) => void): void
}

/**
 * 标准化 Modbus 请求描述，用于中间层或日志模块。
 *
 * @example
 * ```ts
 * const req: ModbusRequest = {
 *   transactionId: 1,
 *   unitId: 1,
 *   functionCode: 3,
 *   startAddress: 100,
 *   quantity: 2,
 * }
 * ```
 */
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

/**
 * 标准化 Modbus 响应结构，覆盖读写成功与异常场景。
 *
 * @example
 * ```ts
 * const res: ModbusResponse = {
 *   transactionId: 1,
 *   unitId: 1,
 *   functionCode: 3,
 *   success: true,
 *   registers: [42, 43],
 * }
 * ```
 */
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

/**
 * 调度器任务模型，定义执行体与完成回调。
 *
 * @example
 * ```ts
 * const task: RequestTask<number> = {
 *   id: 1,
 *   priority: 50,
 *   timeout: 1000,
 *   execute: async () => 123,
 *   resolve: () => {},
 *   reject: () => {},
 * }
 * ```
 */
export interface RequestTask<T = unknown> {
  id: number
  priority: number
  timeout: number
  execute(): Promise<T>
  resolve(value: T): void
  reject(err: Error): void
}

/**
 * 订阅项定义，用于轮询引擎。
 *
 * @example
 * ```ts
 * const sub: Subscription = {
 *   id: 'sub-1',
 *   unitId: 1,
 *   start: 0,
 *   length: 4,
 *   interval: 500,
 *   callback: (registers) => console.log(registers),
 * }
 * ```
 */
export interface Subscription {
  id: string
  unitId: number
  start: number
  length: number
  interval: number
  callback: (registers: number[]) => void
}

/**
 * 请求超时异常。
 *
 * @example
 * ```ts
 * throw new TimeoutError('task 1 timeout')
 * ```
 */
export class TimeoutError extends Error {
  constructor(message = 'request timeout') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * 连接关闭异常。
 *
 * @example
 * ```ts
 * throw new ConnectionClosedError('socket is closed')
 * ```
 */
export class ConnectionClosedError extends Error {
  constructor(message = 'connection closed') {
    super(message)
    this.name = 'ConnectionClosedError'
  }
}

/**
 * 协议错误异常，用于帧格式、校验或字段解析失败。
 *
 * @example
 * ```ts
 * throw new ProtocolError('invalid mbap length')
 * ```
 */
export class ProtocolError extends Error {
  constructor(message = 'protocol error') {
    super(message)
    this.name = 'ProtocolError'
  }
}

/**
 * 传输错误异常，用于 socket/ws/ipc 层失败。
 *
 * @example
 * ```ts
 * throw new TransportError('send failed')
 * ```
 */
export class TransportError extends Error {
  constructor(message = 'transport error') {
    super(message)
    this.name = 'TransportError'
  }
}
