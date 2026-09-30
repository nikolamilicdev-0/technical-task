import type { Citation } from '@kb/contracts'
import { Button, Tooltip } from '@kb/ui'

import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { getChatStrings } from '@/features/chat/lib/chat-strings'

// Sized to sit inside a line of prose rather than as a standalone chip.
const INLINE_CHIP_CLASSES = 'mx-0.5 h-5 min-w-5 px-1.5 align-text-bottom text-xs tabular-nums'

interface CitationChipProps {
  citation: Citation
  /** The sources list the chip opens. */
  sourcesId: string
  onReveal: (index: number) => void
}

/** An inline `[n]` marker: names its source and opens it in the answer's sources. */
export function CitationChip({ citation, sourcesId, onReveal }: CitationChipProps) {
  const strings = getChatStrings(useT())
  const label = interpolate(strings.sources.chip, {
    index: citation.index,
    title: citation.documentTitle,
  })
  const reveal = () => onReveal(citation.index)

  return (
    <Tooltip content={citation.documentTitle}>
      <Button
        variant="chip"
        aria-label={label}
        aria-controls={sourcesId}
        onClick={reveal}
        className={INLINE_CHIP_CLASSES}
      >
        {citation.index}
      </Button>
    </Tooltip>
  )
}
