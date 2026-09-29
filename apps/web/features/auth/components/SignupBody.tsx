import { routes } from '@/core/config/routes'
import { getDictionary } from '@/core/i18n/dictionary'
import { AuthFooterLinks } from '@/features/auth/components/AuthFooterLinks'
import { AuthHeading } from '@/features/auth/components/AuthHeading'
import { SignupFormClient } from '@/features/auth/components/SignupFormClient'
import { getAuthStrings } from '@/features/auth/lib/auth-strings'

export function SignupBody() {
  const strings = getAuthStrings(getDictionary())
  const header = (
    <AuthHeading title={strings.signup.title} description={strings.signup.description} />
  )
  const footer = (
    <AuthFooterLinks
      prompt={strings.signup.footerPrompt}
      linkLabel={strings.signup.footerLink}
      href={routes.login}
    />
  )

  return <SignupFormClient header={header} footer={footer} />
}
