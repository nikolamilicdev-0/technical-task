import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { IconComponent } from '../types'
import { Flex } from './Flex'
import { Text } from './Text'

export interface EmptyStateProps {
  title: ReactNode
  icon?: IconComponent
  description?: ReactNode
  action?: ReactNode
  /** Heading element for the title; `h1` when the state is the whole page's content. */
  titleAs?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
}

/** Designed empty, error and not-found moments: an icon, what happened and what to do next. */
export function EmptyState({
  title,
  icon: Icon,
  description,
  action,
  titleAs = 'h2',
  className,
}: EmptyStateProps) {
  const iconBadge = Icon ? (
    <Flex
      align="center"
      justify="center"
      className="size-12 rounded-full bg-surface-container-high text-on-surface-variant"
    >
      <Icon aria-hidden className="size-6" />
    </Flex>
  ) : null

  return (
    <Flex
      direction="column"
      align="center"
      gap="md"
      className={cn('mx-auto max-w-md px-4 py-12 text-center', className)}
    >
      {iconBadge}
      <Flex direction="column" align="center" gap="xs">
        <Text as={titleAs} variant="subheading">
          {title}
        </Text>
        {description ? <Text tone="muted">{description}</Text> : null}
      </Flex>
      {action}
    </Flex>
  )
}
