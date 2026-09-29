'use client'

import { Button, Callout, Flex, FormField, Input } from '@kb/ui'
import type { ReactNode } from 'react'

import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { SignupConfirmation } from '@/features/auth/components/SignupConfirmation'
import { PASSWORD_MIN_LENGTH } from '@/features/auth/constants'
import { useSignupForm } from '@/features/auth/hooks/useSignupForm'
import { getAuthStrings } from '@/features/auth/lib/auth-strings'

interface SignupFormClientProps {
  /** Server-rendered heading and footer, hidden once the confirmation state takes over. */
  header: ReactNode
  footer: ReactNode
}

export function SignupFormClient({ header, footer }: SignupFormClientProps) {
  const strings = getAuthStrings(useT())
  const { form, onSubmit, pending, serverError, confirmationEmail } = useSignupForm()
  const { errors } = form.formState

  if (confirmationEmail) return <SignupConfirmation email={confirmationEmail} />

  const passwordHint = interpolate(strings.fields.passwordHint, { minimum: PASSWORD_MIN_LENGTH })
  const errorNotice = serverError ? (
    <Callout tone="error" icon={icons.error} role="alert">
      {serverError}
    </Callout>
  ) : null

  return (
    <Flex direction="column" gap="lg">
      {header}
      <Flex as="form" direction="column" gap="md" noValidate onSubmit={onSubmit}>
        {errorNotice}
        <FormField label={strings.fields.email} error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={strings.fields.emailPlaceholder}
            {...form.register('email')}
          />
        </FormField>
        <FormField
          label={strings.fields.password}
          description={passwordHint}
          error={errors.password?.message}
        >
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </FormField>
        <Button type="submit" size="lg" fullWidth loading={pending} className="mt-2">
          {strings.signup.submit}
        </Button>
      </Flex>
      {footer}
    </Flex>
  )
}
