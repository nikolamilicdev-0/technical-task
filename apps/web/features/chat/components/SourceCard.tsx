import type { Citation } from '@kb/contracts'
import { Badge, Card, cn, Flex, Text } from '@kb/ui'
import Link from 'next/link'

import { routes } from '@/core/config/routes'
import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { getChatStrings } from '@/features/chat/lib/chat-strings'
import { sectionPath, toPlainExcerpt } from '@/features/chat/lib/citations'

const PERCENT = 100

interface SourceCardProps {
  citation: Citation
  /** The source's score as a 0–1 share of the answer's best one. */
  relevance: number
  /** Opened from its chip in the answer. */
  highlighted: boolean
}

/** One retrieved passage: its number, document, section, excerpt and whether the answer cites it. */
export function SourceCard({ citation, relevance, highlighted }: SourceCardProps) {
  const strings = getChatStrings(useT())
  const section = sectionPath(citation)
  const openLabel = interpolate(strings.sources.open, { title: citation.documentTitle })
  const relevanceWidth = { inlineSize: `${Math.round(relevance * PERCENT)}%` }

  const citedBadge = citation.cited ? (
    <Badge tone="success" className="shrink-0">
      {strings.sources.citedBadge}
    </Badge>
  ) : null
  const sectionLine = section ? (
    <Text variant="caption" tone="muted" truncate>
      {section}
    </Text>
  ) : null

  return (
    <Card
      as="li"
      padding="sm"
      tabIndex={-1}
      data-citation={citation.index}
      aria-current={highlighted ? 'true' : undefined}
      className={cn(
        'outline-hidden transition-shadow motion-reduce:transition-none',
        highlighted && 'border-primary ring-3 ring-primary/20'
      )}
    >
      <Flex direction="column" gap="xs">
        <Flex align="center" gap="sm">
          <Badge tone={citation.cited ? 'primary' : 'neutral'} className="shrink-0 tabular-nums">
            {citation.index}
          </Badge>
          <Text variant="label" truncate className="min-w-0 flex-1">
            <Link
              href={routes.documents.detail(citation.documentId)}
              aria-label={openLabel}
              className="underline-offset-4 hover:underline"
            >
              {citation.documentTitle}
            </Link>
          </Text>
          {citedBadge}
        </Flex>
        {sectionLine}
        <Text variant="caption" tone="muted" className="line-clamp-3 break-words">
          {toPlainExcerpt(citation.excerpt)}
        </Text>
        <span
          aria-hidden
          className="mt-1 block h-0.5 overflow-hidden rounded-full bg-outline-variant"
        >
          <span className="block h-full rounded-full bg-primary/60" style={relevanceWidth} />
        </span>
      </Flex>
    </Card>
  )
}
