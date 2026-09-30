import type { CreateDocumentInput } from '@kb/contracts'
import { Callout, Card, Flex, FormField, Input } from '@kb/ui'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { ContentEditor } from '@/features/documents/components/ContentEditor'
import { DocumentFormActions } from '@/features/documents/components/DocumentFormActions'
import { DocumentTagsField } from '@/features/documents/components/DocumentTagsField'
import { useDocumentForm } from '@/features/documents/hooks/useDocumentForm'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import type { DocumentFormValues } from '@/features/documents/types'

interface DocumentFormProps {
  defaultValues: DocumentFormValues
  submitLabel: string
  onSubmit: (values: CreateDocumentInput) => Promise<unknown>
  editing?: boolean
  busy?: boolean
}

export function DocumentForm({
  defaultValues,
  submitLabel,
  onSubmit,
  editing = false,
  busy = false,
}: DocumentFormProps) {
  const strings = getDocumentsStrings(useT())
  const { form, submit, serverError, discard } = useDocumentForm({
    defaultValues,
    onSubmit,
    resetOnSuccess: editing,
  })
  const { errors, isDirty, isSubmitting } = form.formState

  const errorNotice = serverError ? (
    <Callout tone="error" icon={icons.error} role="alert">
      {serverError}
    </Callout>
  ) : null

  return (
    <Card padding="none">
      <Flex
        as="form"
        direction="column"
        gap="lg"
        noValidate
        onSubmit={submit}
        className="p-4 sm:p-6"
      >
        {errorNotice}
        <FormField label={strings.form.title} error={errors.title?.message}>
          <Input
            autoComplete="off"
            placeholder={strings.form.titlePlaceholder}
            {...form.register('title')}
          />
        </FormField>
        <DocumentTagsField control={form.control} />
        <ContentEditor
          control={form.control}
          registration={form.register('content')}
          error={errors.content?.message}
        />
        <DocumentFormActions
          submitLabel={submitLabel}
          editing={editing}
          dirty={isDirty}
          pending={isSubmitting || busy}
          onDiscard={discard}
        />
      </Flex>
    </Card>
  )
}
