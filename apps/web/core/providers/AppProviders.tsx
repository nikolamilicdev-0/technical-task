import { Toaster, TooltipProvider } from '@kb/ui'
import type { ReactNode } from 'react'

import type { Dictionary } from '@/core/i18n/dictionary'
import { TranslationProvider } from '@/core/i18n/TranslationProvider'
import { QueryProvider } from '@/core/providers/QueryProvider'

interface AppProvidersProps {
  dictionary: Dictionary
  children: ReactNode
}

/** App-wide context: copy, server-state cache, tooltips and the toast region. */
export function AppProviders({ dictionary, children }: AppProvidersProps) {
  return (
    <TranslationProvider dictionary={dictionary}>
      <QueryProvider>
        <TooltipProvider>
          {children}
          <Toaster
            label={dictionary.common.notifications}
            closeLabel={dictionary.common.dismissNotification}
          />
        </TooltipProvider>
      </QueryProvider>
    </TranslationProvider>
  )
}
