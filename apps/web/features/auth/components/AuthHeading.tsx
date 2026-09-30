import { Flex, Text } from '@kb/ui'

interface AuthHeadingProps {
  title: string
  description: string
}

export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <Flex direction="column" gap="xs">
      <Text variant="title">{title}</Text>
      <Text tone="muted">{description}</Text>
    </Flex>
  )
}
