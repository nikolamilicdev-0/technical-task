import { useContext } from 'react'

import { CitationContext } from '@/features/chat/lib/citation-context'
import type { CitationActions } from '@/features/chat/types'

export function useCitationActions(): CitationActions | null {
  return useContext(CitationContext)
}
