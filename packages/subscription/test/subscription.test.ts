import { describe, expect, it } from 'vitest'
import { SubscriptionEngine } from '../src/index'

describe('subscription merge', () => {
  it('merges adjacent ranges in one poll group', () => {
    const engine = new SubscriptionEngine({
      readRegisters: async () => [1, 2, 3, 4, 5],
    })

    const unsub1 = engine.subscribe({
      unitId: 1,
      start: 0,
      length: 3,
      interval: 100,
      callback: () => {},
    })

    const unsub2 = engine.subscribe({
      unitId: 1,
      start: 3,
      length: 2,
      interval: 100,
      callback: () => {},
    })

    const groups = engine.getPollGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].mergedRanges).toEqual([{ unitId: 1, start: 0, length: 5 }])

    unsub1()
    unsub2()
  })

  it('dedupes duplicate range requests', () => {
    const engine = new SubscriptionEngine({
      readRegisters: async () => [1, 2],
    })

    engine.subscribe({ unitId: 1, start: 10, length: 2, interval: 500, callback: () => {} })
    engine.subscribe({ unitId: 1, start: 10, length: 2, interval: 500, callback: () => {} })

    const groups = engine.getPollGroups()
    expect(groups[0].mergedRanges).toHaveLength(1)
    expect(groups[0].mergedRanges[0]).toEqual({ unitId: 1, start: 10, length: 2 })
  })
})
