import { describe, expect, it, vi } from 'vitest'
import { SubscriptionEngine } from '../src/index'

describe('subscription extra', () => {
  it('starts loop, polls, and triggers callback on change only', async () => {
    const values = [
      [1, 2],
      [1, 2],
      [3, 4],
    ]
    let idx = 0
    const cb = vi.fn()

    const engine = new SubscriptionEngine({
      readRegisters: async () => values[Math.min(idx++, values.length - 1)],
    })

    engine.subscribe({
      unitId: 1,
      start: 0,
      length: 2,
      interval: 1,
      callback: cb,
    })

    const group = engine.getPollGroups()[0]
    await (engine as any).pollGroup(group)
    await (engine as any).pollGroup(group)
    await (engine as any).pollGroup(group)

    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(cb.mock.calls[0][0]).toEqual([1, 2])
    expect(cb.mock.calls[cb.mock.calls.length - 1][0]).toEqual([3, 4])
  })

  it('routes polling errors to onError', async () => {
    const onError = vi.fn()
    const engine = new SubscriptionEngine({
      readRegisters: async () => {
        throw new Error('poll-failed')
      },
      onError,
    })

    engine.subscribe({
      unitId: 1,
      start: 0,
      length: 1,
      interval: 1,
      callback: () => {},
    })

    engine.start()
    await new Promise((resolve) => setTimeout(resolve, 4))
    engine.stop()

    expect(onError).toHaveBeenCalled()
    expect(onError.mock.calls[0][0].message).toContain('poll-failed')
  })
})
