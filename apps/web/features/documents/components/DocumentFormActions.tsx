import { Button, Flex, Text } from '@kb/ui'
import Link from 'next/link'
import { type MouseEvent, useRef } from 'react'

import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

const ACTIONS_BAR_CLASSES =
  'sticky bottom-0 z-10 -mx-4 -mb-4 rounded-b-xl border-t border-outline-variant bg-surface-container-lowest/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:-mb-6 sm:px-6'

function preventSubmit(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault()
}

interface DocumentFormActionsProps {
  submitLabel: string
  editing: boolean
  dirty: boolean
  pending: boolean
  onDiscard: () => void
}

export function DocumentFormActions({
  submitLabel,
  editing,
  dirty,
  pending,
  onDiscard,
}: DocumentFormActionsProps) {
  const t = useT()
  const strings = getDocumentsStrings(t)
  const saveRef = useRef<HTMLButtonElement>(null)
  // Nothing to save: Save stays focusable (a save or discard never drops focus) but does nothing.
  const inactive = editing && !dirty

  // Discard removes itself, so focus moves on to Save.
  const discard = () => {
    onDiscard()
    saveRef.current?.focus()
  }

  const unsavedNote =
    editing && dirty ? (
      <Text variant="caption" tone="muted">
        {strings.form.unsaved}
      </Text>
    ) : null
  const discardButton =
    editing && dirty ? (
      <Button variant="ghost" onClick={discard} disabled={pending}>
        {strings.form.discard}
      </Button>
    ) : null
  const cancelLink = editing ? null : (
    <Button asChild variant="ghost">
      <Link href={routes.documents.list}>{t.common.cancel}</Link>
    </Button>
  )

  return (
    <Flex align="center" gap="sm" className={ACTIONS_BAR_CLASSES}>
      {unsavedNote}
      <Flex gap="sm" className="ms-auto">
        {discardButton}
        {cancelLink}
        <Button
          ref={saveRef}
          type="submit"
          loading={pending}
          aria-disabled={inactive || pending || undefined}
          onClick={inactive ? preventSubmit : undefined}
        >
          {submitLabel}
        </Button>
      </Flex>
    </Flex>
  )
}
