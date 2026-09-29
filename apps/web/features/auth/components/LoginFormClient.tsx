'use client'

import { Button, Callout, Flex, FormField, Input } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { useLoginForm } from '@/features/auth/hooks/useLoginForm'
import { getAuthStrings } from '@/features/auth/lib/auth-strings'

interface LoginFormClientProps {
  /** Where to continue after signing in; validated before use. */
  next?: string
  /** The user was sent here because their session ended. */
  sessionExpired: boolean
}

export function LoginFormClient({ next, sessionExpired }: LoginFormClientProps) {
  const strings = getAuthStrings(useT())
  const { form, onSubmit, pending, serverError } = useLoginForm(next)
  const { errors } = form.formState

  const errorNotice = serverError ? (
    <Callout tone="error" icon={icons.error} role="alert">
      {serverError}
    </Callout>
  ) : null
  // Once the user has tried again, the fresh error replaces the expiry notice.
  const expiryNotice =
    sessionExpired && !serverError ? (
      <Callout tone="warning">{strings.login.sessionExpired}</Callout>
    ) : null

  return (
    <Flex as="form" direction="column" gap="md" noValidate onSubmit={onSubmit}>
      {errorNotice}
      {expiryNotice}
      <FormField label={strings.fields.email} error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={strings.fields.emailPlaceholder}
          {...form.register('email')}
        />
      </FormField>
      <FormField label={strings.fields.password} error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...form.register('password')} />
      </FormField>
      <Button type="submit" size="lg" fullWidth loading={pending} className="mt-2">
        {strings.login.submit}
      </Button>
    </Flex>
  )
}
