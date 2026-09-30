import type { Metadata } from 'next'

import { getDictionary } from '@/core/i18n/dictionary'
import { UsageBody } from '@/features/usage/components/UsageBody'

export const metadata: Metadata = { title: getDictionary().usage.title }

export default function UsagePage() {
  return <UsageBody />
}
