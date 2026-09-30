import { CONVERSATION_TITLE_MAX } from '@kb/contracts'
import { Button, Callout, Dialog, Flex, FormField, Input } from '@kb/ui'
import { useId } from 'react'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { useRenameConversationForm } from '@/features/chat/hooks/useRenameConversationForm'
import { getChatStrings } from '@/features/chat/lib/chat-strings'
import type { ConversationTarget } from '@/features/chat/types'

interface RenameConversationDialogProps {
  open: boolean
  target: ConversationTarget | null
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
}

export function RenameConversationDialog({
  open,
  target,
  onClose,
  onCloseAutoFocus,
}: RenameConversationDialogProps) {
  const t = useT()
  const strings = getChatStrings(t)
  const formId = useId()
  const { form, submit, startEditing, serverError } = useRenameConversationForm(target, onClose)
  const { errors, isSubmitting } = form.formState

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onClose()
  }
  // The title field, not the close button, is where a rename starts.
  const focusField = (event: Event) => {
    event.preventDefault()
    startEditing()
  }
  const errorNotice = serverError ? (
    <Callout tone="error" icon={icons.error} role="alert">
      {serverError}
    </Callout>
  ) : null
  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={formId} loading={isSubmitting}>
        {strings.rename.submit}
      </Button>
    </>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={strings.rename.title}
      closeLabel={t.common.close}
      footer={footer}
      size="sm"
      onOpenAutoFocus={focusField}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Flex as="form" id={formId} direction="column" gap="md" noValidate onSubmit={submit}>
        {errorNotice}
        <FormField label={strings.rename.field} error={errors.title?.message}>
          <Input
            autoComplete="off"
            maxLength={CONVERSATION_TITLE_MAX}
            {...form.register('title')}
          />
        </FormField>
      </Flex>
    </Dialog>
  )
}
