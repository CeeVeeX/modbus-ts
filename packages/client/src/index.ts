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

export interface ModbusClientOptions {
  transport: Transport
  defaultUnitId?: number
  defaultTimeout?: number
  mode?: ModbusWireMode
}

export type ClientEvent = 'connect' | 'disconnect' | 'timeout' | 'error'

type EventHandler = (error?: Error) => void

interface InFlight {
  tx: number
  resolve: (response: ModbusResponse) => void
  reject: (error: Error) => void
}

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

  async connect(): Promise<void> {
    await this.options.transport.connect()
    this.subscriptionEngine.start()
    this.emit('connect')
  }

  async close(): Promise<void> {
    this.subscriptionEngine.stop()
    this.scheduler.close(new ConnectionClosedError())
    await this.options.transport.close()
  }

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
      if ((error as Error).name === 'TimeoutError') {
        this.emit('timeout', error as Error)
      }
      throw error
    }
  }

  private async performRequest(tx: number, frame: Uint8Array): Promise<ModbusResponse> {
    return new Promise<ModbusResponse>(async (resolve, reject) => {
      this.inFlight = {
        tx,
        resolve,
        reject,
      }
      try {
        await this.options.transport.send(frame)
      } catch (error) {
        this.inFlight = null
        reject(error as Error)
      }
    })
  }

  private nextTx(): number {
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
