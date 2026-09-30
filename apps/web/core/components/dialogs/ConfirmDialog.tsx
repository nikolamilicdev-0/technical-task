'use client'

import { Button, Dialog } from '@kb/ui'

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
  /** Where focus goes on close; opened without a trigger, it has nowhere to return to. */
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
  const cancel = () => onOpenChange(false)

  const footer = (
    <>
      <Button variant="outline" onClick={cancel} disabled={pending}>
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
      onCloseAutoFocus={onCloseAutoFocus}
    />
  )
}
