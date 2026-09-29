'use client'

import { Section } from '@kb/ui'
import { useEffect } from 'react'

import { ErrorState } from '@/core/components/states/ErrorState'
import type { RouteErrorProps } from '@/core/types'

/** Body of every `error.tsx` boundary: logs the failure and offers a retry in the page's place. */
export function RouteErrorFallback({ error, retry }: RouteErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Section>
      <ErrorState onRetry={retry} titleAs="h1" />
    </Section>
  )
}
