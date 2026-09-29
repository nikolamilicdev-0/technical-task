import { type CreateDocumentInput, MAX_TAGS } from '@kb/contracts'
import { FormField } from '@kb/ui'
import { type Control, useController } from 'react-hook-form'

import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { TagsInput } from '@/features/documents/components/TagsInput'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import type { DocumentFormValues } from '@/features/documents/types'

const NO_TAGS: readonly string[] = []

interface DocumentTagsFieldProps {
  control: Control<DocumentFormValues, unknown, CreateDocumentInput>
}

/** The form's tags, labelled and described like the other fields. */
export function DocumentTagsField({ control }: DocumentTagsFieldProps) {
  const strings = getDocumentsStrings(useT())
  // Destructured here: the compiler lint would treat the whole `field` object as a ref.
  const {
    field: { value, onChange, onBlur, name, ref, disabled },
    fieldState,
  } = useController({ control, name: 'tags' })
  const hint = interpolate(strings.form.tagsHint, { maximum: MAX_TAGS })

  return (
    <FormField label={strings.form.tags} description={hint} error={fieldState.error?.message}>
      <TagsInput
        value={value ?? NO_TAGS}
        onChange={onChange}
        onBlur={onBlur}
        name={name}
        ref={ref}
        disabled={disabled}
      />
    </FormField>
  )
}
