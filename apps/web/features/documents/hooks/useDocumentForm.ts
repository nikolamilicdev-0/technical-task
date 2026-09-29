import { type CreateDocumentInput, createDocumentSchema } from '@kb/contracts'
import { useForm } from 'react-hook-form'

import { isApiError } from '@/core/api/api-error'
import { applyFieldErrors, getServerError, setServerError } from '@/core/api/form-errors'
import { getErrorMessage } from '@/core/api/get-error-message'
import { useUnsavedChangesWarning } from '@/core/forms/useUnsavedChangesWarning'
import { useZodResolver } from '@/core/forms/useZodResolver'
import { useT } from '@/core/i18n/useT'
import { DOCUMENT_FORM_FIELDS } from '@/features/documents/constants'
import type { DocumentFormValues } from '@/features/documents/types'

interface UseDocumentFormOptions {
  defaultValues: DocumentFormValues
  /** Rejects with an ApiError when the API refuses the values. */
  onSubmit: (values: CreateDocumentInput) => Promise<unknown>
  /** Edit mode: once saved, the submitted values become the clean state. */
  resetOnSuccess: boolean
}

/** Create and edit form state: the contracts schema validates, API field errors land on fields. */
export function useDocumentForm({
  defaultValues,
  onSubmit,
  resetOnSuccess,
}: UseDocumentFormOptions) {
  const t = useT()
  const resolver = useZodResolver(createDocumentSchema)
  const form = useForm<DocumentFormValues, unknown, CreateDocumentInput>({
    resolver,
    defaultValues,
  })
  useUnsavedChangesWarning(form.formState.isDirty)

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      if (resetOnSuccess) form.reset(values)
    } catch (error) {
      if (isApiError(error) && applyFieldErrors(error, form.setError, DOCUMENT_FORM_FIELDS)) return
      setServerError(form.setError, getErrorMessage(error, t.errors))
    }
  })

  return {
    form,
    submit,
    serverError: getServerError(form.formState.errors),
    discard: () => form.reset(),
  }
}
