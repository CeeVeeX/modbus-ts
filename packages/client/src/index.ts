import {
  ConnectionClosedError,
  ProtocolError,
  type ModbusResponse,
  type RequestTask,
  type Transport,
} from '@modbus-ts/core'
import {
  decodeResponseByMode,
  encodeReadCoilsByMode,
  encodeReadDiscreteInputsByMode,
  encodeReadHoldingRegistersByMode,
  encodeWriteMultipleCoilsByMode,
  encodeWriteMultipleRegistersByMode,
  encodeWriteSingleCoilByMode,
  encodeWriteSingleRegisterByMode,
  type ModbusWireMode,
} from '@modbus-ts/protocol'
import { PRIORITY, RequestScheduler } from '@modbus-ts/scheduler'
import { SubscriptionEngine } from '@modbus-ts/subscription'

/**
 * Modbus 客户端初始化选项。
 *
 * @example
 * ```ts
 * const options: ModbusClientOptions = {
 *   transport,
 *   defaultUnitId: 1,
 *   defaultTimeout: 1000,
 *   mode: 'tcp',
 * }
 * ```
 */
export interface ModbusClientOptions {
  transport: Transport
  defaultUnitId?: number
  defaultTimeout?: number
  mode?: ModbusWireMode
}

/**
 * 客户端事件类型。
 *
 * @example
 * ```ts
 * const event: ClientEvent = 'connect'
 * ```
 */
export type ClientEvent = 'connect' | 'disconnect' | 'timeout' | 'error'

type EventHandler = (error?: Error) => void

interface InFlight {
  tx: number
  resolve: (response: ModbusResponse) => void
  reject: (error: Error) => void
}

/**
 * 高层 Modbus 客户端。
 *
 * @example
 * ```ts
 * const client = new ModbusClient({ transport, defaultUnitId: 1 })
 * await client.connect()
 * const regs = await client.readHoldingRegisters(0, 2)
 * ```
 */
export class ModbusClient {
  private scheduler = new RequestScheduler()
  private events = new Map<ClientEvent, Set<EventHandler>>()
  private subscriptionEngine: SubscriptionEngine
  private sequence = 0
  private inFlight: InFlight | null = null
  private mode: ModbusWireMode

  constructor(private readonly options: ModbusClientOptions) {
    this.mode = options.mode ?? 'tcp'

    const transportAny = options.transport as Transport & {
      onConnect?: (cb: () => void) => void
    }

    options.transport.onData((data) => {
      try {
        const response = decodeResponseByMode(data, this.mode)
        // TCP 通过 transactionId 精确匹配；RTU/ASCII 由于串行上下文，使用当前 inFlight。
        if (this.inFlight && (this.mode !== 'tcp' || this.inFlight.tx === response.transactionId)) {
          this.inFlight.resolve({
            ...response,
            transactionId: this.inFlight.tx,
          })
          this.inFlight = null
        }
      } catch (error) {
        this.emit('error', error as Error)
      }
    })

    options.transport.onClose((error) => {
      this.scheduler.clearPending(new ConnectionClosedError())
      if (this.inFlight) {
        this.inFlight.reject(new ConnectionClosedError())
        this.inFlight = null
      }
      this.emit('disconnect', error)
    })

    transportAny.onConnect?.(() => {
      this.emit('connect')
      this.subscriptionEngine.start()
    })

    this.subscriptionEngine = new SubscriptionEngine({
      readRegisters: (params) =>
        this.readHoldingRegisters(params.start, params.length, {
          unitId: params.unitId,
          priority: PRIORITY.polling,
        }),
      onError: (error) => this.emit('error', error),
    })
  }

  /**
   * 注册客户端事件监听器。
   *
   * @example
   * ```ts
   * const off = client.on('error', console.error)
   * off()
   * ```
   */
  on(event: ClientEvent, handler: EventHandler): () => void {
    let handlers = this.events.get(event)
    if (!handlers) {
      handlers = new Set<EventHandler>()
      this.events.set(event, handlers)
    }
    handlers.add(handler)

    return () => {
      handlers?.delete(handler)
    }
  }

  /**
   * 建立传输连接。
   *
   * @example
   * ```ts
   * await client.connect()
   * ```
   */
  async connect(): Promise<void> {
    await this.options.transport.connect()
    this.subscriptionEngine.start()
    this.emit('connect')
  }

  /**
   * 关闭连接并清理调度与订阅。
   *
   * @example
   * ```ts
   * await client.close()
   * ```
   */
  async close(): Promise<void> {
    this.subscriptionEngine.stop()
    this.scheduler.close(new ConnectionClosedError())
    await this.options.transport.close()
  }

  /**
   * 读取保持寄存器（FC3）或输入寄存器（FC4）。
   *
   * @example
   * ```ts
   * const regs = await client.readHoldingRegisters(0, 4)
   * ```
   */
  async readHoldingRegisters(
    startAddress: number,
    quantity: number,
    options?: {
      unitId?: number
      timeout?: number
      priority?: number
      functionCode?: 3 | 4
    },
  ): Promise<number[]> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000

    const frame = encodeReadHoldingRegistersByMode({
      mode: this.mode,
      transactionId: tx,
      unitId,
      startAddress,
      quantity,
      functionCode: options?.functionCode ?? 3,
    })

    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.read,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (!response.success) {
      throw new ProtocolError(`modbus exception ${response.exceptionCode}`)
    }
    return response.registers ?? []
  }

  /**
   * 读取输入寄存器（FC4）。
   *
   * @example
   * ```ts
   * const regs = await client.readInputRegisters(0, 4)
   * ```
   */
  async readInputRegisters(
    startAddress: number,
    quantity: number,
    options?: {
      unitId?: number
      timeout?: number
      priority?: number
    },
  ): Promise<number[]> {
    return this.readHoldingRegisters(startAddress, quantity, {
      ...options,
      functionCode: 4,
    })
  }

  /**
   * 读取线圈（FC1）。
   *
   * @example
   * ```ts
   * const coils = await client.readCoils(0, 8)
   * ```
   */
  async readCoils(
    startAddress: number,
    quantity: number,
    options?: {
      unitId?: number
      timeout?: number
      priority?: number
    },
  ): Promise<boolean[]> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000

    const frame = encodeReadCoilsByMode({
      mode: this.mode,
      transactionId: tx,
      unitId,
      startAddress,
      quantity,
    })

    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.read,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (!response.success) {
      throw new ProtocolError(`modbus exception ${response.exceptionCode}`)
    }
    return (response.coils ?? []).slice(0, quantity)
  }

  /**
   * 读取离散输入（FC2）。
   *
   * @example
   * ```ts
   * const inputs = await client.readDiscreteInputs(0, 8)
   * ```
   */
  async readDiscreteInputs(
    startAddress: number,
    quantity: number,
    options?: {
      unitId?: number
      timeout?: number
      priority?: number
    },
  ): Promise<boolean[]> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000

    const frame = encodeReadDiscreteInputsByMode({
      mode: this.mode,
      transactionId: tx,
      unitId,
      startAddress,
      quantity,
    })

    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.read,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (!response.success) {
      throw new ProtocolError(`modbus exception ${response.exceptionCode}`)
    }
    return (response.discreteInputs ?? []).slice(0, quantity)
  }

  /**
   * 写单个保持寄存器（FC6）。
   *
   * @example
   * ```ts
   * await client.writeSingleRegister(10, 123)
   * ```
   */
  async writeSingleRegister(
    address: number,
    value: number,
    options?: { unitId?: number; timeout?: number; priority?: number },
  ): Promise<void> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000
    const frame = encodeWriteSingleRegisterByMode({
      mode: this.mode,
      transactionId: tx,
      unitId,
      address,
      value,
    })

    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.write,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (!response.success) {
      throw new ProtocolError(`modbus exception ${response.exceptionCode}`)
    }
  }

  /**
   * 写单个线圈（FC5）。
   *
   * @example
   * ```ts
   * await client.writeSingleCoil(11, true)
   * ```
   */
  async writeSingleCoil(
    address: number,
    value: boolean,
    options?: { unitId?: number; timeout?: number; priority?: number },
  ): Promise<void> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000
    const frame = encodeWriteSingleCoilByMode({
      mode: this.mode,
      transactionId: tx,
      unitId,
      address,
      value,
    })

    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.write,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (!response.success) {
      throw new ProtocolError(`modbus exception ${response.exceptionCode}`)
    }
  }

  /**
   * 连续写多个保持寄存器（FC16）。
   *
   * @example
   * ```ts
   * await client.writeMultipleRegisters(100, [0x1234, 0x5678])
   * ```
   */
  async writeMultipleRegisters(
    startAddress: number,
    values: number[],
    options?: { unitId?: number; timeout?: number; priority?: number },
  ): Promise<void> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000
    const frame = encodeWriteMultipleRegistersByMode({
      mode: this.mode,
      transactionId: tx,
      unitId,
      startAddress,
      values,
    })

    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.write,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (!response.success) {
      throw new ProtocolError(`modbus exception ${response.exceptionCode}`)
    }
  }

  /**
   * 连续写多个线圈（FC15）。
   *
   * @example
   * ```ts
   * await client.writeMultipleCoils(20, [true, false, true])
   * ```
   */
  async writeMultipleCoils(
    startAddress: number,
    values: boolean[],
    options?: { unitId?: number; timeout?: number; priority?: number },
  ): Promise<void> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000
    const frame = encodeWriteMultipleCoilsByMode({
      mode: this.mode,
      transactionId: tx,
      unitId,
      startAddress,
      values,
    })

    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.write,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (!response.success) {
      throw new ProtocolError(`modbus exception ${response.exceptionCode}`)
    }
  }

  /**
   * 订阅保持寄存器区间轮询。
   *
   * @example
   * ```ts
   * const unsub = client.subscribe({ start: 0, length: 2, interval: 500, callback: console.log })
   * ```
   */
  subscribe(params: {
    unitId?: number
    start: number
    length: number
    interval: number
    callback: (registers: number[]) => void
  }): () => void {
    return this.subscriptionEngine.subscribe({
      unitId: params.unitId ?? this.options.defaultUnitId ?? 1,
      start: params.start,
      length: params.length,
      interval: params.interval,
      callback: params.callback,
    })
  }

  private async scheduleRequest(task: RequestTask<ModbusResponse>): Promise<ModbusResponse> {
    try {
      return await this.scheduler.schedule(task)
    } catch (error) {
      // 调度器把超时作为普通异常抛出；这里统一转成客户端 timeout 事件，
      // 让上层既能捕获异常，也能通过事件做监控或告警。
      if ((error as Error).name === 'TimeoutError') {
        this.emit('timeout', error as Error)
      }
      throw error
    }
  }

  private async performRequest(tx: number, frame: Uint8Array): Promise<ModbusResponse> {
    return new Promise<ModbusResponse>((resolve, reject) => {
      // 当前客户端假设“单连接串行请求”：任何时刻仅保留一个 inFlight。
      // 该约束由 RequestScheduler 保证，避免响应乱序匹配。
      this.inFlight = {
        tx,
        resolve,
        reject,
      }

      void this.options.transport.send(frame).catch((error) => {
        this.inFlight = null
        reject(error as Error)
      })
    })
  }

  private nextTx(): number {
    // transactionId 按 16 位递增循环；0 常留作未初始化/保留值，这里跳过。
    this.sequence = (this.sequence + 1) & 0xffff
    if (this.sequence === 0) {
      this.sequence = 1
    }
    return this.sequence
  }

  private emit(event: ClientEvent, error?: Error): void {
    this.events.get(event)?.forEach((handler) => handler(error))
  }
}
