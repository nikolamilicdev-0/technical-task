import { Toaster, type ToasterProps, TooltipProvider } from '@kb/ui'
import type { ReactNode } from 'react'

import type { Dictionary } from '@/core/i18n/dictionary'
import { TranslationProvider } from '@/core/i18n/TranslationProvider'
import { QueryProvider } from '@/core/providers/QueryProvider'

// Top-right keeps toasts clear of bars pinned to the bottom, such as the editor's Save.
const TOAST_POSITION: ToasterProps['position'] = 'top-right'

interface AppProvidersProps {
  dictionary: Dictionary
  children: ReactNode
}

export function AppProviders({ dictionary, children }: AppProvidersProps) {
  return (
    <TranslationProvider dictionary={dictionary}>
      <QueryProvider>
        <TooltipProvider>
          {children}
          <Toaster
            label={dictionary.common.notifications}
            closeLabel={dictionary.common.dismissNotification}
            position={TOAST_POSITION}
          />
        </TooltipProvider>
      </QueryProvider>
    </TranslationProvider>
  )
}
