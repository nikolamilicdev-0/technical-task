import { useEffect, useState } from 'react'

const RELATIVE_TIME_REFRESH_MS = 60_000

export function useNow(refreshMs: number = RELATIVE_TIME_REFRESH_MS): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), refreshMs)
    return () => window.clearInterval(timer)
  }, [refreshMs])

  return now
}
