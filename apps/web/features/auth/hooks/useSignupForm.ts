import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { getServerError, setServerError } from '@/core/api/form-errors'
import { useZodResolver } from '@/core/forms/useZodResolver'
import { DEFAULT_AUTHENTICATED_ROUTE } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { SIGNUP_DEFAULT_VALUES } from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/useAuthRedirect'
import { getAuthErrorMessage, getAuthStrings } from '@/features/auth/lib/auth-strings'
import { signupSchema } from '@/features/auth/schema'
import { authService } from '@/features/auth/services/auth-service'
import type { SignupResult, SignupValues } from '@/features/auth/types'

/**
 * Sign-up form state. Without email confirmation the user is signed in and redirected; with it,
 * `confirmationEmail` is set so the form can switch to the "check your inbox" state.
 */
export function useSignupForm() {
  const strings = getAuthStrings(useT())
  const resolver = useZodResolver(signupSchema)
  const form = useForm<SignupValues, unknown, SignupValues>({
    resolver,
    defaultValues: SIGNUP_DEFAULT_VALUES,
  })
  const { isRedirecting, redirectTo } = useAuthRedirect()
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)

  const onSubmit = form.handleSubmit(async (values) => {
    let result: SignupResult
    try {
      result = await authService.signUp(values)
    } catch (error) {
      setServerError(form.setError, getAuthErrorMessage(strings, error))
      return
    }
    if (result.status === 'confirmationRequired') setConfirmationEmail(result.email)
    else redirectTo(DEFAULT_AUTHENTICATED_ROUTE)
  })

  return {
    form,
    onSubmit,
    confirmationEmail,
    pending: form.formState.isSubmitting || isRedirecting,
    serverError: getServerError(form.formState.errors),
  }
}
