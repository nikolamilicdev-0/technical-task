export const ABORT_ERROR_NAME = 'AbortError'

/** A request the caller cancelled on purpose; never worth reporting to the user. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === ABORT_ERROR_NAME
}
