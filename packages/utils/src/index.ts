/**
 * 异步休眠指定毫秒。
 *
 * @param ms 休眠时长（毫秒）
 * @returns 休眠结束后 resolve 的 Promise
 *
 * @example
 * ```ts
 * await sleep(200)
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 延迟对象（Deferred），用于在外部手动触发 Promise 的完成/失败。
 *
 * @example
 * ```ts
 * const d = new Deferred<number>()
 * setTimeout(() => d.resolve(42), 100)
 * const value = await d.promise
 * ```
 */
export class Deferred<T> {
  promise: Promise<T>
  resolve!: (value: T) => void
  reject!: (error: Error) => void

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

/**
 * 比较两个 number 数组是否逐项相等。
 *
 * @example
 * ```ts
 * areArraysEqual([1, 2], [1, 2]) // true
 * areArraysEqual([1, 2], [2, 1]) // false
 * ```
 */
export function areArraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}
