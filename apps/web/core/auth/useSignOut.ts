import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { signOut } from '@/core/auth/sign-out'
import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'

/**
 * Signs out, then reloads on the login page: the full navigation discards every cached query,
 * so no request of the old session can fire in between and no data outlives the session.
 */
export function useSignOut(): { signOut: () => void; isSigningOut: boolean } {
  const t = useT()
  const { mutate, isPending } = useMutation({
    mutationFn: signOut,
    onSuccess: () => window.location.replace(routes.login),
    onError: () => toast.error(t.shell.signOutFailed),
  })
  return { signOut: () => mutate(), isSigningOut: isPending }
}
