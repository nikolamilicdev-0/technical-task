import { Button, Card, EmptyState, Flex } from '@kb/ui'
import Link from 'next/link'

import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { getUsageStrings } from '@/features/usage/lib/usage-strings'

/** Nothing metered in the period yet: the two things that start using tokens. */
export function UsageEmpty() {
  const t = useT()
  const strings = getUsageStrings(t)
  const AddIcon = icons.add
  const ChatIcon = icons.newChat

  const actions = (
    <Flex wrap justify="center" gap="sm">
      <Button asChild>
        <Link href={routes.documents.new}>
          <AddIcon aria-hidden />
          {t.documents.actions.new}
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={routes.chat.index}>
          <ChatIcon aria-hidden />
          {t.chat.newChat}
        </Link>
      </Button>
    </Flex>
  )

  return (
    <Card padding="none" className="border-dashed">
      <EmptyState
        icon={icons.usage}
        title={strings.empty.title}
        description={strings.empty.description}
        action={actions}
        className="py-16"
      />
    </Card>
  )
}
