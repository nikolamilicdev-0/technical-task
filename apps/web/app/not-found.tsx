import { Flex } from '@kb/ui'

import { NotFoundState } from '@/core/components/states/NotFoundState'

export default function NotFound() {
  return (
    <Flex as="main" align="center" justify="center" className="min-h-dvh px-4">
      <NotFoundState titleAs="h1" />
    </Flex>
  )
}
