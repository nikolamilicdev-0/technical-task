import { useForm } from 'react-hook-form'

import { getServerError, setServerError } from '@/core/api/form-errors'
import { getSafeNextPath } from '@/core/auth/resolve-auth-redirect'
import { useZodResolver } from '@/core/forms/useZodResolver'
import { useT } from '@/core/i18n/useT'
import { LOGIN_DEFAULT_VALUES } from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/useAuthRedirect'
import { getAuthErrorMessage, getAuthStrings } from '@/features/auth/lib/auth-strings'
import { loginSchema } from '@/features/auth/schema'
import { authService } from '@/features/auth/services/auth-service'
import type { LoginValues } from '@/features/auth/types'

export function useLoginForm(next: string | undefined) {
  const strings = getAuthStrings(useT())
  const resolver = useZodResolver(loginSchema)
  const form = useForm<LoginValues, unknown, LoginValues>({
    resolver,
    defaultValues: LOGIN_DEFAULT_VALUES,
  })
  const { isRedirecting, redirectTo } = useAuthRedirect()

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await authService.signIn(values)
    } catch (error) {
      setServerError(form.setError, getAuthErrorMessage(strings, error))
      return
    }
    redirectTo(getSafeNextPath(next))
  })

  return {
    form,
    onSubmit,
    pending: form.formState.isSubmitting || isRedirecting,
    serverError: getServerError(form.formState.errors),
  }
}
