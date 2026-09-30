/** Whole milliseconds since `startedAt`, a `performance.now()` reading. */
export function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt)
}
