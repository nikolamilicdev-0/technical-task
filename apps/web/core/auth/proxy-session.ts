import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { resolveAuthRedirect } from '@/core/auth/resolve-auth-redirect'
import { getPublicEnv } from '@/core/config/env'

type HeaderMap = Record<string, string>

function applyHeaders(response: NextResponse, headers: HeaderMap): void {
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
}

/** Redirects carry the refreshed cookies too, so a rotated refresh token is never dropped. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = getPublicEnv()
  let response = NextResponse.next({ request })
  let sessionHeaders: HeaderMap = {}

  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
        sessionHeaders = headers
        applyHeaders(response, headers)
      },
    },
  })

  // Nothing may run between creating the client and this call: it refreshes expired tokens.
  const { data } = await supabase.auth.getClaims()
  const target = resolveAuthRedirect({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated: Boolean(data?.claims),
  })
  if (!target) return response

  const redirect = NextResponse.redirect(new URL(target, request.url))
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  applyHeaders(redirect, sessionHeaders)
  return redirect
}
