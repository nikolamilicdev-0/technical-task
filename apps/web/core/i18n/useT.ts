import { useContext } from 'react'

import type { Dictionary } from '@/core/i18n/dictionary'
import { TranslationContext } from '@/core/i18n/translation-context'

/** The dictionary for client components (`const t = useT(); t.auth.login.title`). */
export function useT(): Dictionary {
  const dictionary = useContext(TranslationContext)
  if (!dictionary) throw new Error('useT() must be called inside <TranslationProvider>.')
  return dictionary
}
