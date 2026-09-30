import type { Metadata } from 'next'

import { AUTH_SEARCH_PARAMS } from '@/core/config/routes'
import { getDictionary } from '@/core/i18n/dictionary'
import { pickString, type SearchParams } from '@/core/utils/search-params'
import { LoginBody } from '@/features/auth/components/LoginBody'

export const metadata: Metadata = { title: getDictionary().auth.login.metaTitle }

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  return (
    <LoginBody
      next={pickString(params[AUTH_SEARCH_PARAMS.next])}
      reason={pickString(params[AUTH_SEARCH_PARAMS.reason])}
    />
  )
}
