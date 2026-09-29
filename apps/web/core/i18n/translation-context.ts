import { createContext } from 'react'

import type { Dictionary } from '@/core/i18n/dictionary'

export const TranslationContext = createContext<Dictionary | null>(null)
