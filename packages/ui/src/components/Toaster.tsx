'use client'

import {
  Toaster as SonnerToaster,
  type ToastClassnames,
  type ToasterProps as SonnerToasterProps,
} from 'sonner'

// Unstyled toasts take every visual from theme tokens instead of sonner's built-in palette.
const TOAST_CLASS_NAMES = {
  toast:
    'flex w-full items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-highest p-4 text-on-surface shadow-lg',
  content: 'flex min-w-0 flex-1 flex-col gap-0.5',
  title: 'text-sm leading-5 font-medium',
  description: 'text-sm leading-5 text-on-surface-variant',
  icon: 'mt-0.5 flex shrink-0 items-center [&_svg]:size-4',
  actionButton:
    'shrink-0 cursor-pointer rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-on-primary',
  cancelButton:
    'shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high',
  success: '[&_[data-icon]]:text-success',
  error: '[&_[data-icon]]:text-error',
  warning: '[&_[data-icon]]:text-warning',
  info: '[&_[data-icon]]:text-primary',
} as const satisfies ToastClassnames

export interface ToasterProps {
  /** Accessible name of the notification region. */
  label: string
  /** Accessible name of each toast's close button. */
  closeLabel: string
  position?: SonnerToasterProps['position']
}

export function Toaster({ label, closeLabel, position = 'bottom-right' }: ToasterProps) {
  const toastOptions = {
    unstyled: true,
    closeButtonAriaLabel: closeLabel,
    classNames: TOAST_CLASS_NAMES,
  }
  return (
    <SonnerToaster
      position={position}
      theme="system"
      containerAriaLabel={label}
      toastOptions={toastOptions}
    />
  )
}
