import { type CreateDocumentInput, createDocumentSchema } from '@kb/contracts'
import { useForm } from 'react-hook-form'

import { isApiError } from '@/core/api/api-error'
import { applyFieldErrors, getServerError, setServerError } from '@/core/api/form-errors'
import { getErrorMessage } from '@/core/api/get-error-message'
import { useUnsavedChangesWarning } from '@/core/forms/useUnsavedChangesWarning'
import { useZodResolver } from '@/core/forms/useZodResolver'
import { useT } from '@/core/i18n/useT'
import { DOCUMENT_FORM_FIELDS } from '@/features/documents/constants'
import { haveSameFormValues } from '@/features/documents/lib/to-form-values'
import type { DocumentFormValues } from '@/features/documents/types'

interface UseDocumentFormOptions {
  defaultValues: DocumentFormValues
  onSubmit: (values: CreateDocumentInput) => Promise<unknown>
  resetOnSuccess: boolean
}

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

  // The saved values become the clean state. Text typed while the save ran stays in the fields
  // (and keeps the form dirty); otherwise the fields take the values as the schema saved them.
  const markSaved = (saved: CreateDocumentInput, submitted: DocumentFormValues) => {
    const editedSince = !haveSameFormValues(form.getValues(), submitted)
    form.reset(saved, { keepValues: editedSince })
  }

  const submit = form.handleSubmit(async (values) => {
    const submitted = form.getValues()
    try {
      await onSubmit(values)
      if (resetOnSuccess) markSaved(values, submitted)
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
