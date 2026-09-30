import { type UpdateConversationInput, updateConversationSchema } from '@kb/contracts'
import { useForm } from 'react-hook-form'

import { isApiError } from '@/core/api/api-error'
import { applyFieldErrors, getServerError, setServerError } from '@/core/api/form-errors'
import { getErrorMessage } from '@/core/api/get-error-message'
import { useZodResolver } from '@/core/forms/useZodResolver'
import { useT } from '@/core/i18n/useT'
import { RENAME_FORM_FIELDS } from '@/features/chat/constants'
import { useRenameConversation } from '@/features/chat/hooks/useConversationMutations'
import type { ConversationTarget, RenameConversationValues } from '@/features/chat/types'

/**
 * The rename form for `target`, validated with the API's own schema; it starts from the stored
 * title (empty for an untitled conversation). `focusTitle` selects it, ready to be replaced.
 */
export function useRenameConversationForm(
  target: ConversationTarget | null,
  onRenamed: () => void
) {
  const t = useT()
  const rename = useRenameConversation()
  const resolver = useZodResolver(updateConversationSchema)
  const form = useForm<RenameConversationValues, unknown, UpdateConversationInput>({
    resolver,
    values: { title: target?.title ?? '' },
  })

  const focusTitle = () => form.setFocus('title', { shouldSelect: true })

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

  return { form, submit, focusTitle, serverError: getServerError(form.formState.errors) }
}
