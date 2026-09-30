import { Flex } from '@kb/ui'

import { routes, SESSION_EXPIRED_REASON } from '@/core/config/routes'
import { getDictionary } from '@/core/i18n/dictionary'
import { AuthFooterLinks } from '@/features/auth/components/AuthFooterLinks'
import { AuthHeading } from '@/features/auth/components/AuthHeading'
import { LoginFormClient } from '@/features/auth/components/LoginFormClient'
import { getAuthStrings } from '@/features/auth/lib/auth-strings'

interface LoginBodyProps {
  next?: string
  reason?: string
}

export function LoginBody({ next, reason }: LoginBodyProps) {
  const strings = getAuthStrings(getDictionary())
  const sessionExpired = reason === SESSION_EXPIRED_REASON

  return (
    <Flex direction="column" gap="lg">
      <AuthHeading title={strings.login.title} description={strings.login.description} />
      <LoginFormClient next={next} sessionExpired={sessionExpired} />
      <AuthFooterLinks
        prompt={strings.login.footerPrompt}
        linkLabel={strings.login.footerLink}
        href={routes.signup}
      />
    </Flex>
  )
}
