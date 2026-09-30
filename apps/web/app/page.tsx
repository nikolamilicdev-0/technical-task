import { redirect } from 'next/navigation'

import { DEFAULT_AUTHENTICATED_ROUTE } from '@/core/config/routes'

// proxy.ts already routes `/`; this covers requests the proxy matcher skips.
export default function HomePage() {
  redirect(DEFAULT_AUTHENTICATED_ROUTE)
}
