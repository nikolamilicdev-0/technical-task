'use client'

import { Button, EmptyState, type EmptyStateProps } from '@kb/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'

interface NotFoundStateProps {
  title?: string
  description?: string
  titleAs?: EmptyStateProps['titleAs']
  /** Replaces the default way back to the documents. */
  action?: ReactNode
}

export function NotFoundState({ title, description, titleAs, action }: NotFoundStateProps) {
  const t = useT()
  const backLink = action ?? (
    <Button asChild variant="outline">
      <Link href={routes.documents.list}>{t.states.notFound.action}</Link>
    </Button>
  )

  return (
    <EmptyState
      icon={icons.notFound}
      title={title ?? t.states.notFound.title}
      description={description ?? t.states.notFound.description}
      action={backLink}
      titleAs={titleAs}
    />
  )
}
