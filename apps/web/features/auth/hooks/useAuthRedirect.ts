import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'

// The transition keeps `isRedirecting` true until the signed-in page renders; the refresh drops
// router-cached pages from before sign-in.
export function useAuthRedirect(): { isRedirecting: boolean; redirectTo: (path: string) => void } {
  const router = useRouter()
  const [isRedirecting, startRedirect] = useTransition()
  const redirectTo = useCallback(
    (path: string) => {
      startRedirect(() => {
        router.replace(path)
        router.refresh()
      })
    },
    [router]
  )
  return { isRedirecting, redirectTo }
}
