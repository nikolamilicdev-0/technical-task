export const ABORT_ERROR_NAME = 'AbortError'

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === ABORT_ERROR_NAME
}
