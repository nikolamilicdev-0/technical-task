type Closable = { readonly closed: boolean; once(event: 'close', listener: () => void): unknown }

// `close` also fires after a normal end, when nothing listens any more. A client that left while
// guards ran has closed the response already, and `close` never fires again.
export function abortOnClose(response: Closable): AbortSignal {
  const controller = new AbortController()
  if (response.closed) controller.abort()
  else response.once('close', () => controller.abort())
  return controller.signal
}
