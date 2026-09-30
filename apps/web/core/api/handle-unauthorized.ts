import { buildLoginPath } from '@/core/auth/resolve-auth-redirect'
import { getSupabaseBrowserClient } from '@/core/auth/client'
import { SESSION_EXPIRED_REASON } from '@/core/config/routes'

let refreshInFlight: Promise<boolean> | null = null
let redirecting = false

async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseBrowserClient().auth.refreshSession()
    return !error && data.session !== null
  } catch {
    return false
  }
}

/** Refreshes the session once for any number of concurrent 401s; true when a new token exists. */
export function refreshSessionOnce(): Promise<boolean> {
  refreshInFlight ??= refreshSession().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/** A full navigation to the login page, so no cached query of the old session survives. */
export async function handleUnauthorized(): Promise<void> {
  if (redirecting) return
  redirecting = true
  await getSupabaseBrowserClient()
    .auth.signOut({ scope: 'local' })
    .catch(() => undefined)
  const next = `${window.location.pathname}${window.location.search}`
  window.location.assign(buildLoginPath({ next, reason: SESSION_EXPIRED_REASON }))
}
