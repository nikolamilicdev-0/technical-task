import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { signOut } from '@/core/auth/sign-out'
import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'

// A full reload rather than clearing the cache in place: mounted queries would refetch without
// a token and redirect as if the session had expired (DEC-031).
export function useSignOut(): { signOut: () => void; isSigningOut: boolean } {
  const t = useT()
  const { mutate, isPending } = useMutation({
    mutationFn: signOut,
    onSuccess: () => window.location.replace(routes.login),
    onError: () => toast.error(t.shell.signOutFailed),
  })
  return { signOut: () => mutate(), isSigningOut: isPending }
}
