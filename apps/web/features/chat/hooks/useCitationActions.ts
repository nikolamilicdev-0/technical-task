import { useContext } from 'react'

import { CitationContext } from '@/features/chat/lib/citation-context'
import type { CitationActions } from '@/features/chat/types'

/** The sources of the answer being rendered; null outside an answer. */
export function useCitationActions(): CitationActions | null {
  return useContext(CitationContext)
}
