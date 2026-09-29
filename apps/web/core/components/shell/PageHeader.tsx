import { Flex, Text } from '@kb/ui'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Primary page actions, aligned to the end on wider screens. */
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Flex
      as="header"
      direction={{ base: 'column', sm: 'row' }}
      justify="between"
      gap="md"
      className="sm:items-end"
    >
      <Flex direction="column" gap="xs" className="min-w-0">
        <Text variant="title">{title}</Text>
        {description ? (
          <Text tone="muted" className="max-w-2xl text-base leading-7">
            {description}
          </Text>
        ) : null}
      </Flex>
      {actions ? (
        <Flex align="center" gap="sm" className="shrink-0">
          {actions}
        </Flex>
      ) : null}
    </Flex>
  )
}
