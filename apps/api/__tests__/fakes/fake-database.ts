import type { DatabaseClient } from '../../src/database/database-client.types.js'

export interface RecordedCall {
  readonly method: string
  readonly args: readonly unknown[]
}

/** What an awaited supabase-js query resolves to; unset fields default to null (status 200). */
export interface ScriptedResult {
  readonly data?: unknown
  readonly error?: unknown
  readonly count?: number | null
  readonly status?: number
}

type Settle = (value: unknown) => unknown

const OK_STATUS = 200

/** Every `from()` or `rpc()` chain records its calls and, awaited, resolves to the next result. */
export function fakeDatabase(...results: readonly ScriptedResult[]) {
  const pending = [...results]
  const queries: RecordedCall[][] = []
  const start = (first: RecordedCall): object => {
    const calls: RecordedCall[] = [first]
    queries.push(calls)
    const result = { data: null, error: null, count: null, status: OK_STATUS, ...pending.shift() }
    const chain: object = new Proxy(
      {},
      {
        get(_target, property) {
          if (property === 'then') {
            return (onFulfilled: Settle, onRejected: Settle) =>
              Promise.resolve(result).then(onFulfilled, onRejected)
          }
          return (...args: unknown[]) => {
            calls.push({ method: String(property), args })
            return chain
          }
        },
      }
    )
    return chain
  }
  const db = {
    from: (relation: string): object => start({ method: 'from', args: [relation] }),
    rpc: (fn: string, args: unknown): object => start({ method: 'rpc', args: [fn, args] }),
  }
  return { db: db as unknown as DatabaseClient, queries }
}
