import { createContext } from 'react'

import type { CitationActions } from '@/features/chat/types'

/** react-markdown renderers take no extra props, so each answer provides its sources here. */
export const CitationContext = createContext<CitationActions | null>(null)
