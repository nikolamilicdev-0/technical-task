import { useEffect, useState } from 'react'

/** The current time in epoch ms, refreshed every `refreshMs` so relative times stay current. */
export function useNow(refreshMs: number): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), refreshMs)
    return () => window.clearInterval(timer)
  }, [refreshMs])

  return now
}
