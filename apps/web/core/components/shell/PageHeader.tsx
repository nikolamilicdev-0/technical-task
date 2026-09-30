import { Flex, Text } from '@kb/ui'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
}

export function PageHeader({ title, description }: PageHeaderProps) {
  const descriptionText = description ? (
    <Text tone="muted" className="max-w-2xl text-base leading-7">
      {description}
    </Text>
  ) : null

  return (
    <Flex as="header" direction="column" gap="xs" className="min-w-0">
      <Text variant="title">{title}</Text>
      {descriptionText}
    </Flex>
  )
}
