'use client'

import type { ReactNode } from 'react'

import type { Dictionary } from '@/core/i18n/dictionary'
import { TranslationContext } from '@/core/i18n/translation-context'

interface TranslationProviderProps {
  dictionary: Dictionary
  children: ReactNode
}

export function TranslationProvider({ dictionary, children }: TranslationProviderProps) {
  return <TranslationContext value={dictionary}>{children}</TranslationContext>
}
