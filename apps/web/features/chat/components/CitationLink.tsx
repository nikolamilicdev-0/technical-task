import { MarkdownLink, type MarkdownLinkProps } from '@/core/components/markdown/MarkdownLink'
import { CitationChip } from '@/features/chat/components/CitationChip'
import { useCitationActions } from '@/features/chat/hooks/useCitationActions'
import { parseCitationHref } from '@/features/chat/lib/citations'

/** `#cite-n` links from `linkifyCitations` become chips; any other link renders as usual. */
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
