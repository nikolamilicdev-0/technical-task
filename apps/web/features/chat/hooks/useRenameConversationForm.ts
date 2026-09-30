import { type UpdateConversationInput, updateConversationSchema } from '@kb/contracts'
import { useForm } from 'react-hook-form'

import { isApiError } from '@/core/api/api-error'
import { applyFieldErrors, getServerError, setServerError } from '@/core/api/form-errors'
import { getErrorMessage } from '@/core/api/get-error-message'
import { useZodResolver } from '@/core/forms/useZodResolver'
import { useT } from '@/core/i18n/useT'
import { RENAME_DEFAULT_VALUES, RENAME_FORM_FIELDS } from '@/features/chat/constants'
import { useRenameConversation } from '@/features/chat/hooks/useConversationMutations'
import type { ConversationTarget, RenameConversationValues } from '@/features/chat/types'

export function useRenameConversationForm(
  target: ConversationTarget | null,
  onRenamed: () => void
) {
  const t = useT()
  const rename = useRenameConversation()
  const resolver = useZodResolver(updateConversationSchema)
  const form = useForm<RenameConversationValues, unknown, UpdateConversationInput>({
    resolver,
    defaultValues: RENAME_DEFAULT_VALUES,
  })

  // Each opening starts from the stored title, dropping a cancelled edit and its errors;
  // `keepFieldsRef` keeps the input registered, so it can be focused right away.
  const startEditing = () => {
    form.reset({ title: target?.title ?? '' }, { keepFieldsRef: true })
    form.setFocus('title', { shouldSelect: true })
  }

  const submit = form.handleSubmit(async (input) => {
    if (!target) return
    try {
      await rename.mutateAsync({ id: target.id, input })
      onRenamed()
    } catch (error) {
      if (isApiError(error) && applyFieldErrors(error, form.setError, RENAME_FORM_FIELDS)) return
      setServerError(form.setError, getErrorMessage(error, t.errors))
    }
  })

  return { form, submit, startEditing, serverError: getServerError(form.formState.errors) }
}
