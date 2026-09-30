import { Button, Flex, Text } from '@kb/ui'
import Link from 'next/link'

import { icons } from '@/core/icons'

interface WordmarkProps {
  name: string
  href?: string
}

export function Wordmark({ name, href }: WordmarkProps) {
  const BrandIcon = icons.brand
  const mark = (
    <Flex align="center" gap="sm">
      <Flex
        align="center"
        justify="center"
        className="size-8 shrink-0 rounded-lg bg-primary text-on-primary"
      >
        <BrandIcon aria-hidden className="size-4" />
      </Flex>
      <Text as="span" variant="heading" className="font-display font-medium">
        {name}
      </Text>
    </Flex>
  )

  if (!href) return mark
  return (
    <Button asChild variant="ghost" className="h-auto justify-start px-2 py-1.5">
      <Link href={href}>{mark}</Link>
    </Button>
  )
}
