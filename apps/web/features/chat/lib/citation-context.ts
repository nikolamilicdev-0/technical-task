import { createContext } from 'react'

import type { CitationActions } from '@/features/chat/types'

/** Provided by each answer, so the Markdown link renderer can open that answer's sources. */
export const CitationContext = createContext<CitationActions | null>(null)
