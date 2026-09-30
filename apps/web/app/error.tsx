'use client'

import { Flex } from '@kb/ui'

import { RouteErrorFallback } from '@/core/components/states/RouteErrorFallback'
import type { RouteErrorProps } from '@/core/types'

export default function RootError({ error, retry }: RouteErrorProps) {
  return (
    <Flex as="main" align="center" justify="center" className="min-h-dvh px-4">
      <RouteErrorFallback error={error} retry={retry} />
    </Flex>
  )
}
