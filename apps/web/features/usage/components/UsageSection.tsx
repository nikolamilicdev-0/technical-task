import { Flex, Text } from '@kb/ui'
import type { ReactNode } from 'react'

interface UsageSectionProps {
  title: string
  headingId?: string
  note?: ReactNode
  children: ReactNode
}

export function UsageSection({ title, headingId, note, children }: UsageSectionProps) {
  const noteText = note ? (
    <Text variant="caption" tone="muted">
      {note}
    </Text>
  ) : null

  return (
    <Flex as="section" direction="column" gap="sm">
      <Flex wrap align="baseline" justify="between" gap="sm" className="gap-y-0">
        <Text as="h2" variant="subheading" id={headingId}>
          {title}
        </Text>
        {noteText}
      </Flex>
      {children}
    </Flex>
  )
}
