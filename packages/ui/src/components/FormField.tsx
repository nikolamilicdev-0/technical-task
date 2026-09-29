import { Slot } from 'radix-ui'
import { useId, type ReactElement, type ReactNode } from 'react'

import { Flex } from './Flex'
import { Label } from './Label'
import { Text } from './Text'

export interface FormFieldProps {
  label: ReactNode
  /** The single control (Input, Textarea, …); it receives `id`, `aria-describedby` and `aria-invalid`. */
  children: ReactElement
  description?: ReactNode
  error?: ReactNode
  id?: string
  className?: string
}

export function FormField({ label, children, description, error, id, className }: FormFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const descriptionId = description ? `${controlId}-description` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined
  const invalid = error ? true : undefined

  return (
    <Flex direction="column" gap="xs" className={className}>
      <Label htmlFor={controlId}>{label}</Label>
      <Slot.Root id={controlId} aria-describedby={describedBy} aria-invalid={invalid}>
        {children}
      </Slot.Root>
      {description ? (
        <Text id={descriptionId} variant="caption" tone="muted">
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text id={errorId} variant="caption" tone="error">
          {error}
        </Text>
      ) : null}
    </Flex>
  )
}
