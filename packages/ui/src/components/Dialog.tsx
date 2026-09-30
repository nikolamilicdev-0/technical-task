'use client'

import { cva } from 'class-variance-authority'
import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Button } from './Button'
import { Flex } from './Flex'

type DialogPlacement = 'center' | 'start'
type DialogSize = 'sm' | 'md' | 'lg'

const overlayVariants = cva(
  'fixed inset-0 z-50 bg-scrim/50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in',
  {
    variants: {
      placement: {
        center: 'grid place-items-center overflow-y-auto p-4 sm:p-6',
        start: 'flex justify-start',
      },
    },
  }
)

const contentVariants = cva(
  'relative flex flex-col gap-5 border border-outline-variant bg-surface-container-low text-on-surface shadow-xl outline-hidden',
  {
    variants: {
      placement: {
        center:
          'w-full rounded-xl p-6 data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
        start:
          'h-full w-80 overflow-y-auto rounded-e-xl border-y-0 border-s-0 p-4 data-[state=closed]:animate-slide-out-start data-[state=open]:animate-slide-in-start',
      },
      size: { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' },
    },
    // A drawer is as wide as its column allows on small phones, whatever `size` says.
    compoundVariants: [{ placement: 'start', class: 'max-w-full' }],
  }
)

// Without a description Radix expects an explicit opt-out of `aria-describedby`.
const WITHOUT_DESCRIPTION = { 'aria-describedby': undefined }

export interface DialogProps {
  title: ReactNode
  /** Accessible name of the close button; copy comes from the app. */
  closeLabel: string
  children?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  /** Rendered through `Dialog.Trigger asChild`, so pass a single Button. */
  trigger?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** `start` turns the dialog into a drawer on the inline-start edge. */
  placement?: DialogPlacement
  size?: DialogSize
  /** Keeps the title for screen readers while hiding it visually. */
  hideTitle?: boolean
  /** Runs before focus moves in; `event.preventDefault()` lets a form focus its own field. */
  onOpenAutoFocus?: (event: Event) => void
  /**
   * Runs as the dialog hands focus back. Without a `trigger` there is nothing to return to, so
   * call `event.preventDefault()` and focus the right element yourself.
   */
  onCloseAutoFocus?: (event: Event) => void
}

export function Dialog({
  title,
  closeLabel,
  children,
  description,
  footer,
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  placement = 'center',
  size = 'md',
  hideTitle = false,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: DialogProps) {
  const triggerNode = trigger ? (
    <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
  ) : null
  const describedBy = description ? {} : WITHOUT_DESCRIPTION
  const titleClasses = cn('font-display text-xl leading-tight font-medium', hideTitle && 'sr-only')

  return (
    <DialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {triggerNode}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayVariants({ placement })}>
          <DialogPrimitive.Content
            className={contentVariants({ placement, size })}
            onOpenAutoFocus={onOpenAutoFocus}
            onCloseAutoFocus={onCloseAutoFocus}
            {...describedBy}
          >
            <Flex align="start" justify="between" gap="md">
              <Flex direction="column" gap="xs" className="min-w-0">
                <DialogPrimitive.Title className={titleClasses}>{title}</DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="text-sm leading-6 text-on-surface-variant">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </Flex>
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label={closeLabel}
                  className="-me-2 -mt-1"
                >
                  <XIcon aria-hidden />
                </Button>
              </DialogPrimitive.Close>
            </Flex>
            {children}
            {footer ? (
              <Flex direction={{ base: 'columnReverse', sm: 'row' }} justify="end" gap="sm">
                {footer}
              </Flex>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
