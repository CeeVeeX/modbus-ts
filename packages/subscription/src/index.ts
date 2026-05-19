import type { Subscription } from '@modbus-ts/core'
import { areArraysEqual, sleep } from '@modbus-ts/utils'

/**
 * 带上次数据快照的订阅对象。
 *
 * @example
 * ```ts
 * const group: SubscriptionGroup = {
 *   id: 'sub-1', unitId: 1, start: 0, length: 2, interval: 500,
 *   callback: () => {}, lastData: [1, 2],
 * }
 * ```
 */
export interface SubscriptionGroup extends Subscription {
  lastData?: number[]
}

/**
 * 合并后的读取区间。
 *
 * @example
 * ```ts
 * const range: MergedRange = { unitId: 1, start: 0, length: 10 }
 * ```
 */
export interface MergedRange {
  unitId: number
  start: number
  length: number
}

/**
 * 同一轮询周期的分组信息。
 *
 * @example
 * ```ts
 * const g: PollGroup = { interval: 500, subscriptions: new Map(), mergedRanges: [], running: false }
 * ```
 */
export interface PollGroup {
  interval: number
  subscriptions: Map<string, SubscriptionGroup>
  mergedRanges: MergedRange[]
  running: boolean
}

/**
 * 订阅引擎依赖项。
 *
 * @example
 * ```ts
 * const options: SubscriptionEngineOptions = {
 *   readRegisters: async ({ unitId, start, length }) => [unitId, start, length],
 * }
 * ```
 */
export interface SubscriptionEngineOptions {
  readRegisters: (params: { unitId: number; start: number; length: number }) => Promise<number[]>
  onError?: (error: Error) => void
}

function makeRangeKey(unitId: number, start: number, length: number): string {
  return `${unitId}:${start}:${length}`
}

/**
 * 订阅轮询引擎。
 *
 * - 同 interval 自动分组
 * - 同 unitId 的重叠地址自动合并
 * - 仅在数据变化时触发回调
 *
 * @example
 * ```ts
 * const engine = new SubscriptionEngine({ readRegisters: async () => [1, 2, 3] })
 * const unsub = engine.subscribe({ unitId: 1, start: 0, length: 2, interval: 500, callback: console.log })
 * engine.start()
 * unsub()
 * engine.stop()
 * ```
 */
export class SubscriptionEngine {
  private groups = new Map<number, PollGroup>()
  private running = false
  private seq = 0

  constructor(private readonly options: SubscriptionEngineOptions) {}

  subscribe(params: Omit<Subscription, 'id'>): () => void {
    const id = `sub-${++this.seq}`
    const sub: SubscriptionGroup = {
      ...params,
      id,
    }

    const group = this.ensureGroup(sub.interval)
    group.subscriptions.set(id, sub)
    group.mergedRanges = this.mergeSubscriptions(group.subscriptions)

    return () => {
      group.subscriptions.delete(id)
      group.mergedRanges = this.mergeSubscriptions(group.subscriptions)
    }
  }

  start(): void {
    if (this.running) {
      return
    }
    this.running = true
    for (const group of this.groups.values()) {
      if (!group.running) {
        group.running = true
        void this.runPollLoop(group)
      }
    }
  }

  stop(): void {
    this.running = false
    for (const group of this.groups.values()) {
      group.running = false
    }
  }

  getPollGroups(): PollGroup[] {
    return [...this.groups.values()].map((group) => ({
      ...group,
      subscriptions: new Map(group.subscriptions),
      mergedRanges: [...group.mergedRanges],
    }))
  }

  private ensureGroup(interval: number): PollGroup {
    const found = this.groups.get(interval)
    if (found) {
      if (this.running && !found.running) {
        found.running = true
        void this.runPollLoop(found)
      }
      return found
    }

    const created: PollGroup = {
      interval,
      subscriptions: new Map(),
      mergedRanges: [],
      running: false,
    }
    this.groups.set(interval, created)

    if (this.running) {
      created.running = true
      void this.runPollLoop(created)
    }

    return created
  }

  private mergeSubscriptions(subscriptions: Map<string, SubscriptionGroup>): MergedRange[] {
    const ranges = [...subscriptions.values()]
      .map(
        (s): MergedRange => ({
          unitId: s.unitId,
          start: s.start,
          length: s.length,
        }),
      )
      .sort((a, b) => a.unitId - b.unitId || a.start - b.start)

    const merged: MergedRange[] = []
    for (const range of ranges) {
      const prev = merged[merged.length - 1]
      if (!prev || prev.unitId !== range.unitId) {
        merged.push({ ...range })
        continue
      }

      const prevEnd = prev.start + prev.length
      const currentEnd = range.start + range.length
      // 若新区间和上一区间重叠（或紧邻），合并成一个连续读取区间以减少请求次数。
      if (range.start <= prevEnd) {
        prev.length = Math.max(prevEnd, currentEnd) - prev.start
      } else {
        merged.push({ ...range })
      }
    }

    const deduped = new Map<string, MergedRange>()
    for (const range of merged) {
      deduped.set(makeRangeKey(range.unitId, range.start, range.length), range)
    }
    return [...deduped.values()]
  }

  private async runPollLoop(group: PollGroup): Promise<void> {
    let nextTickAt = Date.now()
    while (this.running && group.running) {
      // 固定周期调度：用理论下次时间减当前时间，避免误差累计漂移。
      nextTickAt += group.interval
      try {
        await this.pollGroup(group)
      } catch (error) {
        this.options.onError?.(error as Error)
      }

      const delay = Math.max(0, nextTickAt - Date.now())
      await sleep(delay)
    }
  }

  private async pollGroup(group: PollGroup): Promise<void> {
    if (group.subscriptions.size === 0) {
      return
    }

    group.mergedRanges = this.mergeSubscriptions(group.subscriptions)

    for (const range of group.mergedRanges) {
      const values = await this.options.readRegisters({
        unitId: range.unitId,
        start: range.start,
        length: range.length,
      })

      for (const sub of group.subscriptions.values()) {
        if (sub.unitId !== range.unitId) {
          continue
        }
        if (sub.start < range.start || sub.start + sub.length > range.start + range.length) {
          continue
        }

        const offset = sub.start - range.start
        const chunk = values.slice(offset, offset + sub.length)
        // 只在数据发生变化时触发回调，避免高频重复通知。
        if (!sub.lastData || !areArraysEqual(sub.lastData, chunk)) {
          sub.lastData = [...chunk]
          sub.callback(chunk)
        }
      }
    }
  }
}
