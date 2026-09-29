import type { DatabaseClient } from '../../src/database/database-client.types.js'

export interface RecordedCall {
  readonly method: string
  readonly args: readonly unknown[]
}

/** What an awaited supabase-js query resolves to; unset fields default to null. */
export interface ScriptedResult {
  readonly data?: unknown
  readonly error?: unknown
  readonly count?: number | null
}

type Settle = (value: unknown) => unknown

/**
 * Stands in for the supabase-js query builder: every `from()` starts a chain that records each
 * call and, once awaited, resolves to the next scripted result.
 */
export function fakeDatabase(...results: readonly ScriptedResult[]) {
  const pending = [...results]
  const queries: RecordedCall[][] = []
  const db = {
    from(relation: string): object {
      const calls: RecordedCall[] = [{ method: 'from', args: [relation] }]
      queries.push(calls)
      const result = { data: null, error: null, count: null, ...pending.shift() }
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
    },
  }
  return { db: db as unknown as DatabaseClient, queries }
}
