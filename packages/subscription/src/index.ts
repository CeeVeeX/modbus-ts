import type { Subscription } from '@modbus-ts/core'
import { areArraysEqual, sleep } from '@modbus-ts/utils'

export interface SubscriptionGroup extends Subscription {
  lastData?: number[]
}

export interface MergedRange {
  unitId: number
  start: number
  length: number
}

export interface PollGroup {
  interval: number
  subscriptions: Map<string, SubscriptionGroup>
  mergedRanges: MergedRange[]
  running: boolean
}

export interface SubscriptionEngineOptions {
  readRegisters: (params: { unitId: number; start: number; length: number }) => Promise<number[]>
  onError?: (error: Error) => void
}

function makeRangeKey(unitId: number, start: number, length: number): string {
  return `${unitId}:${start}:${length}`
}

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
        if (!sub.lastData || !areArraysEqual(sub.lastData, chunk)) {
          sub.lastData = [...chunk]
          sub.callback(chunk)
        }
      }
    }
  }
}
