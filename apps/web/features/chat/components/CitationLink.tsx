import { MarkdownLink, type MarkdownLinkProps } from '@/core/components/markdown/MarkdownLink'
import { CitationChip } from '@/features/chat/components/CitationChip'
import { useCitationActions } from '@/features/chat/hooks/useCitationActions'
import { parseCitationHref } from '@/features/chat/lib/citations'

/**
 * Markdown's `a` inside an answer: `#cite-n` links (from `linkifyCitations`) become chips for
 * source n; every other link, and a number without a source, renders as a normal link.
 */
export function CitationLink(props: MarkdownLinkProps) {
  const actions = useCitationActions()
  const index = parseCitationHref(props.href)
  const citation = index === null ? undefined : actions?.citations[index - 1]
  if (!actions || !citation) return <MarkdownLink {...props} />
  return (
    <CitationChip
      citation={citation}
      sourcesId={actions.sourcesId}
      onReveal={actions.revealSource}
    />
  )
}
