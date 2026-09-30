import { Callout, Flex, Text } from '@kb/ui'
import Link from 'next/link'

import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { describeIndexing, getChatStrings } from '@/features/chat/lib/chat-strings'
import type { IndexingSummary } from '@/features/chat/types'

interface IndexingNoticeProps {
  summary: IndexingSummary
}

export function IndexingNotice({ summary }: IndexingNoticeProps) {
  const strings = getChatStrings(useT())
  const copy = describeIndexing(strings, summary)

  const failedLinks = summary.failed.map((document) => (
    <li key={document.id}>
      <Link
        href={routes.documents.detail(document.id)}
        className="font-medium underline underline-offset-4"
      >
        {document.title}
      </Link>
    </li>
  ))
  const indexingNotice = copy.indexing ? (
    <Callout tone="info" icon={icons.statusPending}>
      {copy.indexing}
    </Callout>
  ) : null
  const failedNotice = copy.failed ? (
    <Callout tone="warning" icon={icons.statusFailed}>
      <Flex direction="column" gap="xs">
        <Text as="span" tone="inherit">
          {copy.failed}
        </Text>
        <Flex as="ul" wrap gap="sm">
          {failedLinks}
        </Flex>
      </Flex>
    </Callout>
  ) : null

  if (!indexingNotice && !failedNotice) return null
  return (
    <Flex direction="column" gap="xs">
      {indexingNotice}
      {failedNotice}
    </Flex>
  )
}
