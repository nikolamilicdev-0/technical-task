import { Button, Flex, Text } from '@kb/ui'
import Link from 'next/link'

interface AuthFooterLinksProps {
  prompt: string
  linkLabel: string
  href: string
}

export function AuthFooterLinks({ prompt, linkLabel, href }: AuthFooterLinksProps) {
  return (
    <Flex align="center" justify="center" gap="xs" wrap>
      <Text as="span" tone="muted">
        {prompt}
      </Text>
      <Button asChild variant="link">
        <Link href={href}>{linkLabel}</Link>
      </Button>
    </Flex>
  )
}
