import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { DEFAULT_LOCALE } from '@/core/config/locale'
import { getDictionary } from '@/core/i18n/dictionary'
import { AppProviders } from '@/core/providers/AppProviders'

import './globals.css'

const dictionary = getDictionary()

export const metadata: Metadata = {
  title: { default: dictionary.meta.title, template: dictionary.meta.titleTemplate },
  description: dictionary.meta.description,
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        <AppProviders dictionary={dictionary}>{children}</AppProviders>
      </body>
    </html>
  )
}
