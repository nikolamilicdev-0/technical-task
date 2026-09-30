'use client'

import { Button, Dialog } from '@kb/ui'
import { useRef } from 'react'

import { useT } from '@/core/i18n/useT'

type ConfirmTone = 'primary' | 'destructive'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  confirmLabel: string
  onConfirm: () => void
  description?: string
  /** Keeps the dialog open with a busy confirm button while the action runs. */
  pending?: boolean
  tone?: ConfirmTone
  /** Where focus goes on close; by default it returns to whatever opened the dialog. */
  onCloseAutoFocus?: (event: Event) => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  confirmLabel,
  onConfirm,
  description,
  pending = false,
  tone = 'destructive',
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  const t = useT()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const cancel = () => onOpenChange(false)
  // Focus starts on the least destructive choice, so a stray Enter never confirms.
  const focusCancel = (event: Event) => {
    event.preventDefault()
    cancelRef.current?.focus()
  }

  const footer = (
    <>
      <Button ref={cancelRef} variant="outline" onClick={cancel} disabled={pending}>
        {t.common.cancel}
      </Button>
      <Button variant={tone} loading={pending} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      closeLabel={t.common.close}
      footer={footer}
      size="sm"
      onOpenAutoFocus={focusCancel}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  )
}
