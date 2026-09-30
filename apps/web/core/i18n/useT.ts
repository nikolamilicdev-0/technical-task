import { useContext } from 'react'

import type { Dictionary } from '@/core/i18n/dictionary'
import { TranslationContext } from '@/core/i18n/translation-context'

export function useT(): Dictionary {
  const dictionary = useContext(TranslationContext)
  if (!dictionary) throw new Error('useT() must be called inside <TranslationProvider>.')
  return dictionary
}
