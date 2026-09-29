/** Parses a response body, returning undefined for empty or non-JSON text. */
export function parseJsonSafely(text: string): unknown {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
