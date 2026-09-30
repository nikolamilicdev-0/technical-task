'use client'

import { Container } from '@kb/ui'

import { RouteErrorFallback } from '@/core/components/states/RouteErrorFallback'
import type { RouteErrorProps } from '@/core/types'

export default function AppError({ error, retry }: RouteErrorProps) {
  return (
    <Container>
      <RouteErrorFallback error={error} retry={retry} />
    </Container>
  )
}
