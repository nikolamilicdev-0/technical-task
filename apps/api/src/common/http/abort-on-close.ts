/** Anything that emits `close` when it is over, such as an Express response. */
type Closable = { once(event: 'close', listener: () => void): unknown }

/**
 * Aborts once the response closes: at the latest when the client disconnects. It also fires
 * after a normal end, when nothing is listening any more.
 */
export function abortOnClose(response: Closable): AbortSignal {
  const controller = new AbortController()
  response.once('close', () => controller.abort())
  return controller.signal
}
