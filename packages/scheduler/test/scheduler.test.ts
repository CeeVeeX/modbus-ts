import { describe, expect, it } from 'vitest'
import { RequestScheduler } from '../src/index'

describe('scheduler', () => {
  it('runs high priority task first', async () => {
    const scheduler = new RequestScheduler()
    const order: number[] = []

    const low = scheduler.schedule({
      id: 1,
      priority: 10,
      timeout: 1000,
      execute: async () => {
        order.push(1)
        return 1
      },
      resolve: () => {},
      reject: () => {},
    })

    const high = scheduler.schedule({
      id: 2,
      priority: 100,
      timeout: 1000,
      execute: async () => {
        order.push(2)
        return 2
      },
      resolve: () => {},
      reject: () => {},
    })

    await Promise.all([low, high])
    expect(order[0]).toBe(2)
  })

  it('rejects pending tasks when cleared', async () => {
    const scheduler = new RequestScheduler()

    const running = scheduler.schedule({
      id: 1,
      priority: 100,
      timeout: 1000,
      execute: async () => new Promise<number>(() => {}),
      resolve: () => {},
      reject: () => {},
    })

    const pending = scheduler.schedule({
      id: 2,
      priority: 50,
      timeout: 1000,
      execute: async () => 2,
      resolve: () => {},
      reject: () => {},
    })

    const pendingAssertion = expect(pending).rejects.toThrow('closed')
    scheduler.clearPending(new Error('closed'))

    running.catch(() => {})
    await pendingAssertion
  })

  it('times out long-running task', async () => {
    const scheduler = new RequestScheduler()

    const timedOut = scheduler.schedule({
      id: 3,
      priority: 10,
      timeout: 10,
      execute: async () => new Promise<number>(() => {}),
      resolve: () => {},
      reject: () => {},
    })

    await expect(timedOut).rejects.toMatchObject({ name: 'TimeoutError' })
  })

  it('rejects schedule after close', async () => {
    const scheduler = new RequestScheduler()
    scheduler.close()

    await expect(
      scheduler.schedule({
        id: 4,
        priority: 1,
        timeout: 100,
        execute: async () => 1,
        resolve: () => {},
        reject: () => {},
      }),
    ).rejects.toMatchObject({ name: 'ConnectionClosedError' })
  })
})
