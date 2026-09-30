import type { Citation } from '@kb/contracts'
import { Button, cn, Flex, Grid } from '@kb/ui'
import { useEffect, useRef } from 'react'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { preferredScrollBehavior } from '@/core/utils/motion'
import { SourceCard } from '@/features/chat/components/SourceCard'
import { describeSources, getChatStrings } from '@/features/chat/lib/chat-strings'
import { relativeRelevance, topScore } from '@/features/chat/lib/citations'
import type { SourceFocusRequest } from '@/features/chat/types'

// Two columns only once the thread itself is wide (both sidebars show from `lg`).
const SOURCE_COLUMNS = { base: 1, xl: 2 } as const

interface SourcesListProps {
  id: string
  citations: readonly Citation[]
  open: boolean
  onOpenChange: (open: boolean) => void
  focusRequest: SourceFocusRequest | null
}

export function SourcesList({ id, citations, open, onOpenChange, focusRequest }: SourcesListProps) {
  const strings = getChatStrings(useT())
  const listRef = useRef<HTMLOListElement>(null)
  const best = topScore(citations)
  const SourcesIcon = icons.sources
  const ExpandIcon = icons.expand

  useEffect(() => {
    if (!focusRequest) return
    const selector = `[data-citation="${focusRequest.index}"]`
    const card = listRef.current?.querySelector<HTMLElement>(selector)
    card?.scrollIntoView({ block: 'nearest', behavior: preferredScrollBehavior() })
    card?.focus({ preventScroll: true })
  }, [focusRequest])

  const toggle = () => onOpenChange(!open)
  const cards = citations.map((citation) => (
    <SourceCard
      key={citation.index}
      citation={citation}
      relevance={relativeRelevance(citation.score, best)}
      highlighted={open && citation.index === focusRequest?.index}
    />
  ))

  return (
    <Flex direction="column" gap="sm">
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        className="-ms-3 self-start text-on-surface-variant"
      >
        <SourcesIcon aria-hidden />
        {describeSources(strings, citations)}
        <ExpandIcon
          aria-hidden
          className={cn('transition-transform motion-reduce:transition-none', open && 'rotate-180')}
        />
      </Button>
      <Grid as="ol" id={id} ref={listRef} hidden={!open} columns={SOURCE_COLUMNS} gap="sm">
        {cards}
      </Grid>
    </Flex>
  )
}
