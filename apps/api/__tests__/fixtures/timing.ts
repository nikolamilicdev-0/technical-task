/** Linear work on hostile input stays under this: generous, yet far below quadratic times. */
export const LINEAR_TIME_BUDGET_MS = 200

/** In `u` mode a surrogate pair is one code point, so only a lone half matches. */
export const LONE_SURROGATE = /[\uD800-\uDFFF]/u

const MICROSECONDS_PER_MILLISECOND = 1_000

// CPU time, not wall time: each test file runs in its own process, so other suites loading the
// machine barely move it.
export function timed<T>(work: () => T): { readonly value: T; readonly ms: number } {
  const before = process.cpuUsage()
  const value = work()
  const { user, system } = process.cpuUsage(before)
  return { value, ms: (user + system) / MICROSECONDS_PER_MILLISECOND }
}
