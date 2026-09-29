import type { DocumentSummary } from '@kb/contracts'
import { Badge, Card, Flex, Text, VisuallyHidden } from '@kb/ui'
import Link from 'next/link'

import { routes } from '@/core/config/routes'
import { interpolate, pluralize } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { formatDateTime } from '@/core/utils/format-date'
import { DocumentStatusBadge } from '@/features/documents/components/DocumentStatusBadge'
import { CARD_VISIBLE_TAGS } from '@/features/documents/constants'
import { formatDocumentMeta, getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import { toPlainPreview } from '@/features/documents/lib/to-plain-preview'

// The title link stretches over the card: one tab stop and one click target per document.
const STRETCHED_LINK_CLASSES =
  'outline-hidden after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary'

interface DocumentCardProps {
  document: DocumentSummary
  /** Shared clock for the relative "updated" time. */
  now: number
}

export function DocumentCard({ document, now }: DocumentCardProps) {
  const strings = getDocumentsStrings(useT())
  const href = routes.documents.detail(document.id)
  const preview = toPlainPreview(document.contentPreview) || strings.card.emptyPreview
  const meta = formatDocumentMeta(strings, document, now)
  const updatedAt = formatDateTime(document.updatedAt)
  const visibleTags = document.tags.slice(0, CARD_VISIBLE_TAGS)
  const hiddenTagCount = document.tags.length - visibleTags.length

  const tagItems = visibleTags.map((tag) => (
    <li key={tag}>
      <Badge>{tag}</Badge>
    </li>
  ))
  const moreTags =
    hiddenTagCount > 0 ? (
      <li>
        <Badge aria-hidden>{interpolate(strings.card.moreTags, { count: hiddenTagCount })}</Badge>
        <VisuallyHidden>{pluralize(strings.card.moreTagsLabel, hiddenTagCount)}</VisuallyHidden>
      </li>
    ) : null
  const tagList =
    document.tags.length > 0 ? (
      <Flex as="ul" wrap gap="xs" aria-label={strings.card.tags}>
        {tagItems}
        {moreTags}
      </Flex>
    ) : null

  return (
    <Card as="li" interactive className="relative">
      <Flex direction="column" gap="md" className="h-full">
        <Flex align="start" justify="between" gap="sm">
          <Text as="h2" variant="subheading" className="line-clamp-2 min-w-0 break-words">
            <Link href={href} className={STRETCHED_LINK_CLASSES}>
              {document.title}
            </Link>
          </Text>
          <DocumentStatusBadge
            status={document.embeddingStatus}
            error={document.embeddingError}
            className="relative z-10 shrink-0"
          />
        </Flex>
        <Text tone="muted" className="line-clamp-3 break-words">
          {preview}
        </Text>
        {tagList}
        <Text variant="caption" tone="muted" truncate title={updatedAt} className="mt-auto">
          {meta}
        </Text>
      </Flex>
    </Card>
  )
}
