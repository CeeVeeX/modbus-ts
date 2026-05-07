import { ConnectionClosedError, TimeoutError, type RequestTask } from '@modbus-ts/core'

export const PRIORITY = {
  write: 100,
  read: 50,
  polling: 10,
} as const

export class RequestScheduler {
  private queue: RequestTask[] = []
  private inFlight = false
  private closed = false
  private dispatchScheduled = false

  schedule<T>(task: RequestTask<T>): Promise<T> {
    if (this.closed) {
      return Promise.reject(new ConnectionClosedError('scheduler is closed'))
    }

    return new Promise<T>((resolve, reject) => {
      const wrapped: RequestTask<T> = {
        ...task,
        resolve,
        reject,
      }
      this.queue.push(wrapped)
      this.queue.sort((a, b) => b.priority - a.priority || a.id - b.id)
      this.scheduleDispatch()
    })
  }

  clearPending(err: Error = new ConnectionClosedError()): void {
    const pending = this.queue.splice(0, this.queue.length)
    for (const task of pending) {
      task.reject(err)
    }
  }

  close(err: Error = new ConnectionClosedError()): void {
    this.closed = true
    this.clearPending(err)
  }

  private async runNext(): Promise<void> {
    if (this.inFlight || this.closed) {
      return
    }

    const task = this.queue.shift()
    if (!task) {
      return
    }

    this.inFlight = true
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new TimeoutError(`task ${task.id} timeout`)), task.timeout)
      })
      const result = await Promise.race([task.execute(), timeoutPromise])
      task.resolve(result)
    } catch (error) {
      task.reject(error as Error)
    } finally {
      this.inFlight = false
      if (this.queue.length > 0 && !this.closed) {
        this.scheduleDispatch()
      }
    }
  }

  private scheduleDispatch(): void {
    if (this.dispatchScheduled || this.closed) {
      return
    }

    this.dispatchScheduled = true
    queueMicrotask(() => {
      this.dispatchScheduled = false
      void this.runNext().catch(() => {
        // Errors are already routed via task.reject.
      })
    })
  }
}
