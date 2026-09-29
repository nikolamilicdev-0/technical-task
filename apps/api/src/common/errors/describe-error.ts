/** A one-line description of anything thrown, for log lines. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
