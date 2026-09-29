'use client'

import { Button, EmptyState } from '@kb/ui'
import Link from 'next/link'

import { routes } from '@/core/config/routes'
import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { getAuthStrings } from '@/features/auth/lib/auth-strings'

/** Shown instead of the form when the project requires email confirmation. */
export function SignupConfirmation({ email }: { email: string }) {
  const { confirmation } = getAuthStrings(useT())
  const description = interpolate(confirmation.description, { email })
  const signInLink = (
    <Button asChild variant="outline">
      <Link href={routes.login}>{confirmation.action}</Link>
    </Button>
  )

  return (
    <EmptyState
      icon={icons.inbox}
      title={confirmation.title}
      titleAs="h1"
      description={description}
      action={signInLink}
      className="py-0"
    />
  )
}
