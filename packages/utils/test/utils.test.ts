import { describe, expect, it } from 'vitest'
import { Deferred, areArraysEqual, sleep } from '../src/index'

describe('utils', () => {
  it('sleep resolves', async () => {
    await expect(sleep(0)).resolves.toBeUndefined()
  })

  it('deferred resolves and rejects', async () => {
    const d1 = new Deferred<number>()
    d1.resolve(42)
    await expect(d1.promise).resolves.toBe(42)

    const d2 = new Deferred<number>()
    d2.reject(new Error('boom'))
    await expect(d2.promise).rejects.toThrow('boom')
  })

  it('areArraysEqual checks length and values', () => {
    expect(areArraysEqual([1, 2], [1, 2])).toBe(true)
    expect(areArraysEqual([1, 2], [1, 3])).toBe(false)
    expect(areArraysEqual([1], [1, 2])).toBe(false)
  })
})
