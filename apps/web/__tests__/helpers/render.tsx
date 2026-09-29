import { TooltipProvider } from '@kb/ui'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

import { TranslationProvider } from '@/core/i18n/TranslationProvider'
import en from '@/messages/en.json'

function Providers({ children }: { children: ReactNode }) {
  return (
    <TranslationProvider dictionary={en}>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </TranslationProvider>
  )
}

/** Renders with the app's copy and tooltip context, as the real providers supply them. */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Providers, ...options })
}
