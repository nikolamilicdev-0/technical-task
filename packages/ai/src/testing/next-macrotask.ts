import { setImmediate } from 'node:timers/promises'

/** Yields to the event loop like a network round trip, so aborts can land between steps. */
export async function nextMacrotask(): Promise<void> {
  await setImmediate()
}
